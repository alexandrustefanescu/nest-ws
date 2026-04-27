import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomUser } from './room-user.entity';

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(RoomUser) private readonly roomUsers: Repository<RoomUser>,
  ) {}

  async getUsersInRoom(roomId: number): Promise<RoomUser[]> {
    return this.roomUsers.find({ where: { roomId } });
  }

  async addUserToRoom(roomId: number, userId: string): Promise<RoomUser> {
    const existing = await this.roomUsers.findOne({ where: { roomId, userId } });
    if (existing) return existing;
    const roomUser = this.roomUsers.create({ roomId, userId });
    return this.roomUsers.save(roomUser);
  }

  async removeUserFromRoom(roomId: number, userId: string): Promise<void> {
    await this.roomUsers.delete({ roomId, userId });
  }

  async clearPresence(): Promise<void> {
    await this.roomUsers.clear();
  }

  async clearRoomPresence(roomId: number): Promise<void> {
    await this.roomUsers.delete({ roomId });
  }
}
