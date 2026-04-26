import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';
import type { ConnectionState, Message, Room, RoomUser } from './chat.models';

const TYPING_DEBOUNCE_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly identity = inject(IdentityService);

  private socket: Socket | null = null;
  private typingTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private typingActive = new Set<number>();

  readonly connectionState = signal<ConnectionState>('connecting');
  readonly rooms = signal<Room[]>([]);
  readonly currentRoomId = signal<number | null>(null);
  readonly roomUsers = signal<Record<number, RoomUser[]>>({});
  readonly roomMessages = signal<Record<number, Message[]>>({});
  readonly typingUsers = signal<Record<number, Set<string>>>({});

  constructor() {
    if (this.isBrowser) {
      this.connect();
    }
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
      const roomId = users[0]?.roomId;
      if (roomId !== undefined) {
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

  private resetTypingTimer(roomId: number): void {
    this.clearTypingTimer(roomId);
    const timer = setTimeout(() => this.typingStop(roomId), TYPING_DEBOUNCE_MS);
    this.typingTimers.set(roomId, timer);
  }

  private clearTypingTimer(roomId: number): void {
    const timer = this.typingTimers.get(roomId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.typingTimers.delete(roomId);
    }
  }
}
