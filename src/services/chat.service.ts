import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { RoomUser } from '../entities/room-user.entity';
import { TypingStatus } from '../entities/typing-status.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(RoomUser)
    private roomUserRepository: Repository<RoomUser>,
    @InjectRepository(TypingStatus)
    private typingStatusRepository: Repository<TypingStatus>,
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
}
