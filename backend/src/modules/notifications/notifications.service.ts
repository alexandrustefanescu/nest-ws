import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

const DEFAULT_LIMIT = 20;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
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

    const notification = this.repo.create({ recipientId, actorId, type, postId });
    const saved = await this.repo.save(notification);

    this.gateway.server.to(`user:${recipientId}`).emit('notification:new', {
      id: saved.id,
      type,
      actorId,
      postId,
      postTitle,
      createdAt: saved.createdAt,
    });
  }

  async listForUser(userId: string, before?: number, limit = DEFAULT_LIMIT): Promise<Notification[]> {
    const where = before !== undefined
      ? { recipientId: userId, id: LessThan(before) }
      : { recipientId: userId };

    return this.repo.find({
      where,
      order: { id: 'DESC' },
      relations: ['post'],
      take: limit,
    });
  }

  async markRead(userId: string, id: number): Promise<void> {
    await this.repo.update({ id, recipientId: userId }, { read: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ recipientId: userId, read: false }, { read: true });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { recipientId: userId, read: false } });
  }
}
