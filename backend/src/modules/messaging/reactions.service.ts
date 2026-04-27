import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReaction } from './message-reaction.entity';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(MessageReaction) private readonly reactions: Repository<MessageReaction>,
  ) {}

  async toggleReaction(
    messageId: number,
    userId: string,
    emoji: string,
  ): Promise<Record<string, string[]>> {
    const existing = await this.reactions.findOne({ where: { messageId, userId, emoji } });
    if (existing) {
      await this.reactions.delete({ messageId, userId, emoji });
    } else {
      const reaction = this.reactions.create({ messageId, userId, emoji });
      await this.reactions.save(reaction);
    }
    return this.aggregateReactions(await this.reactions.find({ where: { messageId } }));
  }

  async getReactionsForRoom(roomId: number): Promise<Record<number, Record<string, string[]>>> {
    const rows = await this.reactions
      .createQueryBuilder('r')
      .innerJoin('r.message', 'm')
      .where('m.roomId = :roomId', { roomId })
      .getMany();

    const result: Record<number, Record<string, string[]>> = {};
    for (const r of rows) {
      if (!result[r.messageId]) result[r.messageId] = {};
      if (!result[r.messageId][r.emoji]) result[r.messageId][r.emoji] = [];
      result[r.messageId][r.emoji].push(r.userId);
    }
    return result;
  }

  private aggregateReactions(rows: MessageReaction[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const r of rows) {
      if (!result[r.emoji]) result[r.emoji] = [];
      result[r.emoji].push(r.userId);
    }
    return result;
  }
}
