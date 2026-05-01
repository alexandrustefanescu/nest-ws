import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';

import { Room } from '../rooms/room.entity';
import { RoomUser } from './room-user.entity';

@Injectable()
export class PresenceService {
  constructor(private readonly em: EntityManager) {}

  async getUsersInRoom(roomId: number): Promise<RoomUser[]> {
    const room = this.em.getReference(Room, roomId);
    return this.em.find(RoomUser, { room });
  }

  async addUserToRoom(roomId: number, userId: string): Promise<RoomUser> {
    const room = this.em.getReference(Room, roomId);
    let roomUser = await this.em.findOne(RoomUser, { room, userId });
    if (!roomUser) {
      roomUser = this.em.create(RoomUser, { room, userId });
      await this.em.flush();
    }
    return roomUser;
  }

  async removeUserFromRoom(roomId: number, userId: string): Promise<void> {
    const room = this.em.getReference(Room, roomId);
    await this.em.nativeDelete(RoomUser, { room, userId });
  }

  async clearPresence(): Promise<void> {
    await this.em.nativeDelete(RoomUser, {});
  }

  async clearRoomPresence(roomId: number): Promise<void> {
    const room = this.em.getReference(Room, roomId);
    await this.em.nativeDelete(RoomUser, { room });
  }
}
