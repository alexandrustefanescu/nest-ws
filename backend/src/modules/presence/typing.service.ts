import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypingStatus } from './typing-status.entity';

@Injectable()
export class TypingService {
  constructor(
    @InjectRepository(TypingStatus) private readonly typingStatuses: Repository<TypingStatus>,
  ) {}

  async markUserTyping(roomId: number, userId: string): Promise<TypingStatus> {
    const expiresAt = new Date(Date.now() + 5000);
    const typingStatus = this.typingStatuses.create({ roomId, userId, expiresAt });
    return this.typingStatuses.save(typingStatus);
  }

  async removeUserTyping(roomId: number, userId: string): Promise<void> {
    await this.typingStatuses.delete({ roomId, userId });
  }

  async clearRoomTyping(roomId: number): Promise<void> {
    await this.typingStatuses.delete({ roomId });
  }
}
