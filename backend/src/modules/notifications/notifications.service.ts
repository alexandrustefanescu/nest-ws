import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';
import type { NotificationType } from '@repo/shared-types';

import { SocialPost } from '../social/social-post.entity';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './notification.entity';

const DEFAULT_LIMIT = 20;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly em: EntityManager,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(
    recipientId: string,
    actorId: string,
    type: NotificationType,
    postId: number,
    postTitle: string,
  ): Promise<void> {
    if (recipientId === actorId) return;

    const post = this.em.getReference(SocialPost, postId);
    const notification = this.em.create(Notification, {
      recipientId,
      actorId,
      type,
      post,
    });
    this.em.persist(notification);
    await this.em.flush();

    this.gateway.server.to(`user:${recipientId}`).emit('notification:new', {
      id: notification.id,
      type,
      actorId,
      postId,
      postTitle,
      createdAt: notification.createdAt,
    });
  }

  async listForUser(
    userId: string,
    before?: number,
    limit = DEFAULT_LIMIT,
  ): Promise<Notification[]> {
    const where =
      before !== undefined
        ? { recipientId: userId, id: { $lt: before } }
        : { recipientId: userId };

    return this.em.find(Notification, where, {
      orderBy: { id: 'DESC' },
      populate: ['post'],
      limit,
    });
  }

  async markRead(userId: string, id: number): Promise<void> {
    await this.em.nativeUpdate(
      Notification,
      { id, recipientId: userId },
      { read: true },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.em.nativeUpdate(
      Notification,
      { recipientId: userId, read: false },
      { read: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.em.count(Notification, { recipientId: userId, read: false });
  }
}
