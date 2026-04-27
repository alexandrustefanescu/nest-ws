import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../modules/rooms/room.entity';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async getAllRooms(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  async getRoomById(id: number): Promise<Room | null> {
    return this.roomRepository.findOne({ where: { id } });
  }

  async createRoom(name: string): Promise<Room> {
    const room = this.roomRepository.create({ name });
    return this.roomRepository.save(room);
  }

  async deleteRoom(id: number): Promise<void> {
    await this.roomRepository.delete({ id });
  }
}
