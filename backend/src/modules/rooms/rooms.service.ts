import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
  ) {}

  async getAllRooms(): Promise<Room[]> {
    return this.rooms.find();
  }

  async getRoomById(id: number): Promise<Room | null> {
    return this.rooms.findOne({ where: { id } });
  }

  async createRoom(name: string): Promise<Room> {
    const room = this.rooms.create({ name });
    return this.rooms.save(room);
  }

  async deleteRoom(id: number): Promise<void> {
    await this.rooms.delete({ id });
  }
}
