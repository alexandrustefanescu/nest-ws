import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { Room } from '../rooms/room.entity';
import { Message } from './message.entity';
import { normalizePostText } from './post-content.policy';

@Injectable()
export class MessagesService {
  constructor(private readonly em: EntityManager) {}

  async saveMessage(
    roomId: number,
    userId: string,
    text: string,
  ): Promise<Message> {
    const room = this.em.getReference(Room, roomId);
    const message = this.em.create(Message, {
      room,
      userId,
      text: normalizePostText(text),
    });
    this.em.persist(message);
    await this.em.flush();
    return message;
  }

  createPost(roomId: number, userId: string, text: string): Promise<Message> {
    return this.saveMessage(roomId, userId, text);
  }

  async getMessageHistory(
    roomId: number,
    before?: number,
    limit = 50,
  ): Promise<Message[]> {
    const room = this.em.getReference(Room, roomId);
    const where =
      before !== undefined ? { room, id: { $lt: before } } : { room };

    const messages = await this.em.find(Message, where, {
      orderBy: { id: 'DESC' },
      limit,
    });
    return messages.reverse();
  }

  getRoomFeed(roomId: number, before?: number, limit = 50): Promise<Message[]> {
    return this.getMessageHistory(roomId, before, limit);
  }

  async deleteMessage(messageId: number, userId: string): Promise<void> {
    const message = await this.em.findOne(Message, { id: messageId });
    if (!message) throw new WsException('Not found');
    if (message.userId !== userId) throw new WsException('Forbidden');
    await this.em.nativeDelete(Message, { id: messageId });
  }

  deletePost(postId: number, userId: string): Promise<void> {
    return this.deleteMessage(postId, userId);
  }

  async clearRoomMessages(roomId: number): Promise<void> {
    const room = this.em.getReference(Room, roomId);
    await this.em.nativeDelete(Message, { room });
  }

  clearRoomFeed(roomId: number): Promise<void> {
    return this.clearRoomMessages(roomId);
  }
}
