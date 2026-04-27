import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../modules/messaging/message.entity';
import { RoomUser } from '../modules/presence/room-user.entity';
import { TypingStatus } from '../modules/presence/typing-status.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(RoomUser)
    private readonly roomUserRepository: Repository<RoomUser>,
    @InjectRepository(TypingStatus)
    private readonly typingStatusRepository: Repository<TypingStatus>,
  ) {}

  async getUsersInRoom(roomId: number): Promise<RoomUser[]> {
    return this.roomUserRepository.find({ where: { roomId } });
  }

  async addUserToRoom(roomId: number, userId: string): Promise<RoomUser> {
    const existing = await this.roomUserRepository.findOne({ where: { roomId, userId } });
    if (existing) {
      return existing;
    }
    const roomUser = this.roomUserRepository.create({ roomId, userId });
    return this.roomUserRepository.save(roomUser);
  }

  async removeUserFromRoom(roomId: number, userId: string): Promise<void> {
    await this.roomUserRepository.delete({ roomId, userId });
  }

  async clearPresence(): Promise<void> {
    await this.roomUserRepository.clear();
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
}
