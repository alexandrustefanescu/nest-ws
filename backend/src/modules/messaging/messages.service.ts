import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Message } from './message.entity';
import { normalizePostText } from './post-content.policy';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  async saveMessage(roomId: number, userId: string, text: string): Promise<Message> {
    const normalizedText = normalizePostText(text);
    const message = this.messages.create({ roomId, userId, text: normalizedText });
    return this.messages.save(message);
  }

  createPost(roomId: number, userId: string, text: string): Promise<Message> {
    return this.saveMessage(roomId, userId, text);
  }

  async getMessageHistory(roomId: number, before?: number, limit = 50): Promise<Message[]> {
    const where = before !== undefined ? { roomId, id: LessThan(before) } : { roomId };
    const messages = await this.messages.find({
      where,
      order: { id: 'DESC' },
      take: limit,
    });
    return messages.reverse();
  }

  getRoomFeed(roomId: number, before?: number, limit = 50): Promise<Message[]> {
    return this.getMessageHistory(roomId, before, limit);
  }

  async deleteMessage(messageId: number, userId: string): Promise<void> {
    const message = await this.messages.findOne({ where: { id: messageId } });
    if (!message) throw new WsException('Not found');
    if (message.userId !== userId) throw new WsException('Forbidden');
    await this.messages.delete({ id: messageId });
  }

  deletePost(postId: number, userId: string): Promise<void> {
    return this.deleteMessage(postId, userId);
  }

  async clearRoomMessages(roomId: number): Promise<void> {
    await this.messages.delete({ roomId });
  }

  clearRoomFeed(roomId: number): Promise<void> {
    return this.clearRoomMessages(roomId);
  }
}
