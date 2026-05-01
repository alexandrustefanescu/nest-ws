import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';

import { TypingStatus } from './typing-status.entity';

@Injectable()
export class TypingService {
  constructor(private readonly em: EntityManager) {}

  async markUserTyping(roomId: number, userId: string): Promise<TypingStatus> {
    const expiresAt = new Date(Date.now() + 5000);
    await this.em.nativeDelete(TypingStatus, { roomId, userId });
    const typingStatus = this.em.create(TypingStatus, {
      roomId,
      userId,
      expiresAt,
    });
    await this.em.flush();
    return typingStatus;
  }

  async removeUserTyping(roomId: number, userId: string): Promise<void> {
    await this.em.nativeDelete(TypingStatus, { roomId, userId });
  }

  async clearRoomTyping(roomId: number): Promise<void> {
    await this.em.nativeDelete(TypingStatus, { roomId });
  }
}
