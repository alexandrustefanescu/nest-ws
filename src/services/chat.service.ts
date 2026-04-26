import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { RoomUser } from '../entities/room-user.entity';
import { TypingStatus } from '../entities/typing-status.entity';
import { MessageReaction } from '../entities/message-reaction.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(RoomUser)
    private roomUserRepository: Repository<RoomUser>,
    @InjectRepository(TypingStatus)
    private typingStatusRepository: Repository<TypingStatus>,
    @InjectRepository(MessageReaction)
    private reactionRepository: Repository<MessageReaction>,
  ) {}

  async saveMessage(roomId: number, userId: string, text: string): Promise<Message> {
    const message = this.messageRepository.create({ roomId, userId, text });
    return this.messageRepository.save(message);
  }

  async getUsersInRoom(roomId: number): Promise<RoomUser[]> {
    return this.roomUserRepository.find({ where: { roomId } });
  }

  async addUserToRoom(roomId: number, userId: string): Promise<RoomUser> {
    const roomUser = this.roomUserRepository.create({ roomId, userId });
    return this.roomUserRepository.save(roomUser);
  }

  async removeUserFromRoom(roomId: number, userId: string): Promise<void> {
    await this.roomUserRepository.delete({ roomId, userId });
  }

  async markUserTyping(roomId: number, userId: string): Promise<TypingStatus> {
    const expiresAt = new Date(Date.now() + 5000);
    const typingStatus = this.typingStatusRepository.create({ roomId, userId, expiresAt });
    return this.typingStatusRepository.save(typingStatus);
  }

  async removeUserTyping(roomId: number, userId: string): Promise<void> {
    await this.typingStatusRepository.delete({ roomId, userId });
  }

  async getTypingUsersInRoom(roomId: number): Promise<TypingStatus[]> {
    return this.typingStatusRepository.find({ where: { roomId } });
  }

  async clearRoomData(roomId: number): Promise<void> {
    await this.messageRepository.delete({ roomId });
    await this.roomUserRepository.delete({ roomId });
    await this.typingStatusRepository.delete({ roomId });
  }

  async toggleReaction(
    messageId: number,
    userId: string,
    emoji: string,
  ): Promise<Record<string, string[]>> {
    const existing = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji },
    });
    if (existing) {
      await this.reactionRepository.delete({ messageId, userId, emoji });
    } else {
      const reaction = this.reactionRepository.create({ messageId, userId, emoji });
      await this.reactionRepository.save(reaction);
    }
    return this.aggregateReactions(
      await this.reactionRepository.find({ where: { messageId } }),
    );
  }

  async getReactionsForRoom(roomId: number): Promise<Record<number, Record<string, string[]>>> {
    const reactions = await this.reactionRepository
      .createQueryBuilder('r')
      .innerJoin('r.message', 'm')
      .where('m.roomId = :roomId', { roomId })
      .getMany();

    const result: Record<number, Record<string, string[]>> = {};
    for (const r of reactions) {
      if (!result[r.messageId]) result[r.messageId] = {};
      if (!result[r.messageId][r.emoji]) result[r.messageId][r.emoji] = [];
      result[r.messageId][r.emoji].push(r.userId);
    }
    return result;
  }

  private aggregateReactions(reactions: MessageReaction[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const r of reactions) {
      if (!result[r.emoji]) result[r.emoji] = [];
      result[r.emoji].push(r.userId);
    }
    return result;
  }
}
