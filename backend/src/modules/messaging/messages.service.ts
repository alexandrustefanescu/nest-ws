import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  saveMessage(roomId: number, userId: string, text: string): Promise<Message> {
    const message = this.messages.create({ roomId, userId, text });
    return this.messages.save(message);
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

  async deleteMessage(messageId: number, userId: string): Promise<void> {
    const message = await this.messages.findOne({ where: { id: messageId } });
    if (!message) throw new WsException('Not found');
    if (message.userId !== userId) throw new WsException('Forbidden');
    await this.messages.delete({ id: messageId });
  }

  async clearRoomMessages(roomId: number): Promise<void> {
    await this.messages.delete({ roomId });
  }
}
