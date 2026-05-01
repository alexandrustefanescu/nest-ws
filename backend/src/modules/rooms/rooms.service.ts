import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';

import { Room } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(private readonly em: EntityManager) {}

  async getAllRooms(): Promise<Room[]> {
    return this.em.find(Room, {});
  }

  async getRoomById(id: number): Promise<Room | null> {
    return this.em.findOne(Room, { id });
  }

  async createRoom(name: string): Promise<Room> {
    const room = this.em.create(Room, { name });
    this.em.persist(room);
    await this.em.flush();
    return room;
  }

  async deleteRoom(id: number): Promise<void> {
    await this.em.nativeDelete(Room, { id });
  }
}
