import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';
import type { ConnectionState, Message, ReactionMap, Room, RoomUser } from './chat.models';

const TYPING_DEBOUNCE_MS = 3000;
const ROOMS_STORAGE_KEY = 'chat_rooms';

function loadRoomsFromStorage(): Room[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ROOMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRoomsToStorage(rooms: Room[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch { /* empty */ }
}

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly identity = inject(IdentityService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private socket: Socket | null = null;
  private typingTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private typingActive = new Set<number>();

  readonly connectionState = signal<ConnectionState>('disconnected');
  readonly rooms = signal<Room[]>(loadRoomsFromStorage());
  readonly currentRoomId = signal<number | null>(null);
  readonly roomUsers = signal<Record<number, RoomUser[]>>({});
  readonly roomMessages = signal<Record<number, Message[]>>({});
  readonly typingUsers = signal<Record<number, Set<string>>>({});
  readonly roomReactions = signal<Record<number, ReactionMap>>({});
  readonly roomHasMore = signal<Record<number, boolean>>({});
  readonly isLoadingMore = signal(false);

  constructor() {
    if (this.isBrowser) {
      this.fetchRoomsFromApi();
      this.connect();
    }
  }

  private fetchRoomsFromApi(): void {
    this.http.get<Room[]>(`${environment.apiUrl}/api/rooms`).subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        saveRoomsToStorage(rooms);
      },
      error: () => {
        // keep cached rooms on API failure
      },
    });
  }

  private connect(): void {
    this.socket = io(environment.wsUrl, { autoConnect: true });

    this.socket.on('connect', () => {
      this.connectionState.set('connected');
      const current = this.currentRoomId();
      if (current !== null) {
        this.joinRoom(current);
      }
    });

    this.socket.on('disconnect', () => this.connectionState.set('disconnected'));
    this.socket.on('reconnect_attempt', () => this.connectionState.set('connecting'));

    this.socket.on('rooms:list', (rooms: Room[]) => {
      this.rooms.set(rooms);
      saveRoomsToStorage(rooms);
      const liveIds = new Set(rooms.map((r) => r.id));
      this.roomMessages.update((prev) => {
        const next: Record<number, Message[]> = {};
        for (const id of Object.keys(prev)) {
          if (liveIds.has(Number(id))) next[Number(id)] = prev[Number(id)];
        }
        return next;
      });
      this.roomUsers.update((prev) => {
        const next: Record<number, RoomUser[]> = {};
        for (const id of Object.keys(prev)) {
          if (liveIds.has(Number(id))) next[Number(id)] = prev[Number(id)];
        }
        return next;
      });
      this.typingUsers.update((prev) => {
        const next: Record<number, Set<string>> = {};
        for (const id of Object.keys(prev)) {
          if (liveIds.has(Number(id))) next[Number(id)] = prev[Number(id)];
        }
        return next;
      });
      for (const id of [...this.typingTimers.keys()]) {
        if (!liveIds.has(id)) {
          this.clearTypingTimer(id);
          this.typingActive.delete(id);
        }
      }
    });

    this.socket.on('users:list', (users: RoomUser[]) => {
      const roomId = users[0]?.roomId ?? this.currentRoomId();
      if (roomId !== null) {
        this.roomUsers.update((prev) => ({ ...prev, [roomId]: users }));
      }
    });

    this.socket.on('message:new', (msg: Message) => {
      this.roomMessages.update((prev) => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] ?? []), msg],
      }));
    });

    this.socket.on('user:typing', (data: { userId: string; roomId?: number }) => {
      const roomId = this.currentRoomId();
      if (roomId === null) return;
      this.typingUsers.update((prev) => {
        const set = new Set(prev[roomId] ?? []);
        set.add(data.userId);
        return { ...prev, [roomId]: set };
      });
    });

    this.socket.on('user:typing-stopped', (data: { userId: string; roomId?: number }) => {
      const roomId = this.currentRoomId();
      if (roomId === null) return;
      this.typingUsers.update((prev) => {
        const set = new Set(prev[roomId] ?? []);
        set.delete(data.userId);
        return { ...prev, [roomId]: set };
      });
    });

    this.socket.on('user:joined', () => {
      // presence reflected via users:list
    });

    this.socket.on('user:left', () => {
      // presence reflected via users:list
    });

    this.socket.on('reactions:snapshot', (snapshot: Record<number, ReactionMap>) => {
      this.roomReactions.set(snapshot);
    });

    this.socket.on('reaction:updated', (data: { messageId: number; reactions: ReactionMap }) => {
      this.roomReactions.update((prev) => ({
        ...prev,
        [data.messageId]: data.reactions,
      }));
    });

    this.socket.on('messages:history', (data: { roomId: number; messages: Message[]; hasMore: boolean }) => {
      this.roomMessages.update((prev) => ({ ...prev, [data.roomId]: data.messages }));
      this.roomHasMore.update((prev) => ({ ...prev, [data.roomId]: data.hasMore }));
    });

    this.socket.on('message:deleted', (data: { roomId: number; messageId: number }) => {
      this.roomMessages.update((prev) => ({
        ...prev,
        [data.roomId]: (prev[data.roomId] ?? []).filter((m) => m.id !== data.messageId),
      }));
      this.roomReactions.update((prev) => {
        const next = { ...prev };
        delete next[data.messageId];
        return next;
      });
    });

    this.socket.on('chat:cleared', (data: { roomId: number }) => {
      this.roomMessages.update((prev) => ({ ...prev, [data.roomId]: [] }));
      this.roomReactions.set({});
    });
  }

  joinRoom(roomId: number): void {
    this.currentRoomId.set(roomId);
    this.socket?.emit('room:join', { roomId, userId: this.identity.userId() });
  }

  leaveRoom(roomId: number): void {
    this.socket?.emit('room:leave', { roomId, userId: this.identity.userId() });
    if (this.currentRoomId() === roomId) {
      this.currentRoomId.set(null);
    }
  }

  createRoom(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.socket?.emit('room:create', { name: trimmed });
  }

  deleteRoom(roomId: number): void {
    this.socket?.emit('room:delete', { roomId });
  }

  sendMessage(roomId: number, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.socket?.emit('message:send', { roomId, userId: this.identity.userId(), text: trimmed });
  }

  typingStart(roomId: number): void {
    if (!this.typingActive.has(roomId)) {
      this.typingActive.add(roomId);
      this.socket?.emit('typing:start', { roomId, userId: this.identity.userId() });
    }
    this.resetTypingTimer(roomId);
  }

  typingStop(roomId: number): void {
    this.clearTypingTimer(roomId);
    if (this.typingActive.has(roomId)) {
      this.typingActive.delete(roomId);
      this.socket?.emit('typing:stop', { roomId, userId: this.identity.userId() });
    }
  }

  loadMoreMessages(roomId: number, before: number): void {
    if (this.isLoadingMore()) return;
    this.isLoadingMore.set(true);
    this.socket?.emit(
      'messages:load-more',
      { roomId, before },
      (res: { messages: Message[]; hasMore: boolean }) => {
        this.roomMessages.update((prev) => ({
          ...prev,
          [roomId]: [...res.messages, ...(prev[roomId] ?? [])],
        }));
        this.roomHasMore.update((prev) => ({ ...prev, [roomId]: res.hasMore }));
        this.isLoadingMore.set(false);
      },
    );
  }

  deleteMessage(roomId: number, messageId: number): void {
    this.socket?.emit('message:delete', { roomId, messageId, userId: this.identity.userId() });
  }

  clearChat(roomId: number): void {
    this.socket?.emit('chat:clear', { roomId, userId: this.identity.userId() });
  }

  private resetTypingTimer(roomId: number): void {
    this.clearTypingTimer(roomId);
    const timer = setTimeout(() => this.typingStop(roomId), TYPING_DEBOUNCE_MS);
    this.typingTimers.set(roomId, timer);
  }

  toggleReaction(roomId: number, messageId: number, emoji: string): void {
    this.socket?.emit('reaction:toggle', {
      roomId,
      messageId,
      userId: this.identity.userId(),
      emoji,
    });
  }

  private clearTypingTimer(roomId: number): void {
    const timer = this.typingTimers.get(roomId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.typingTimers.delete(roomId);
    }
  }
}
