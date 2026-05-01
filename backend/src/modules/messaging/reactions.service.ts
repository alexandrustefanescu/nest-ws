import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';

import { Message } from './message.entity';
import { MessageReaction } from './message-reaction.entity';

@Injectable()
export class ReactionsService {
  constructor(private readonly em: EntityManager) {}

  async toggleReaction(
    messageId: number,
    userId: string,
    emoji: string,
  ): Promise<Record<string, string[]>> {
    const message = this.em.getReference(Message, messageId);
    const existing = await this.em.findOne(MessageReaction, {
      message,
      userId,
      emoji,
    });
    if (existing) {
      await this.em.nativeDelete(MessageReaction, { message, userId, emoji });
    } else {
      const reaction = this.em.create(MessageReaction, {
        message,
        userId,
        emoji,
      });
      this.em.persist(reaction);
      await this.em.flush();
    }
    const reactions = await this.em.find(MessageReaction, { message });
    return this.aggregateReactions(reactions);
  }

  async getReactionsForRoom(
    roomId: number,
  ): Promise<Record<number, Record<string, string[]>>> {
    const rows = await this.em.find(
      MessageReaction,
      { message: { room: { id: roomId } } },
      { populate: ['message'] },
    );

    const result: Record<number, Record<string, string[]>> = {};
    for (const r of rows) {
      const msgId = r.message.id;
      if (!result[msgId]) result[msgId] = {};
      if (!result[msgId][r.emoji]) result[msgId][r.emoji] = [];
      result[msgId][r.emoji].push(r.userId);
    }
    return result;
  }

  private aggregateReactions(
    rows: MessageReaction[],
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const r of rows) {
      if (!result[r.emoji]) result[r.emoji] = [];
      result[r.emoji].push(r.userId);
    }
    return result;
  }
}
