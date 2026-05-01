import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatSocket } from '../chat/chat-socket';
import { Identity } from '../identity/identity';

export interface NotificationItem {
  id: number;
  type: 'like' | 'comment';
  actorId: string;
  postId: number;
  postTitle: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(Identity);
  private readonly chatSocket = inject(ChatSocket);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);

  constructor() {
    void this.loadUnreadCount();
    this.chatSocket.onNotification((n: unknown) => {
      const item = n as NotificationItem;
      this.notifications.update((prev) => [item, ...prev]);
      this.unreadCount.update((c) => c + 1);
    });
  }

  async load(): Promise<void> {
    const userId = this.identity.userId();
    const res = await firstValueFrom(
      this.http.get<{ notifications: NotificationItem[] }>(
        `${environment.apiUrl}/api/notifications`,
        { params: { userId, limit: '30' } },
      ),
    );
    this.notifications.set(res?.notifications ?? []);
  }

  async markRead(id: number): Promise<void> {
    const userId = this.identity.userId();
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/api/notifications/${id}/read`, null, {
        params: { userId },
      }),
    );
    this.notifications.update((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    this.unreadCount.update((c) => Math.max(0, c - 1));
  }

  async markAllRead(): Promise<void> {
    const userId = this.identity.userId();
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/notifications/read-all`, null, {
        params: { userId },
      }),
    );
    this.notifications.update((prev) => prev.map((n) => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }

  private async loadUnreadCount(): Promise<void> {
    const userId = this.identity.userId();
    if (!userId) return;
    const res = await firstValueFrom(
      this.http.get<{ count: number }>(
        `${environment.apiUrl}/api/notifications/unread-count`,
        { params: { userId } },
      ),
    );
    this.unreadCount.set(res?.count ?? 0);
  }
}
