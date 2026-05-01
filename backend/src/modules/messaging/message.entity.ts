import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Room } from '../rooms/room.entity';

@Entity({ tableName: 'messages' })
export class Message {
  @ApiProperty({ example: 1 })
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Room)
  room!: Room;

  @ApiProperty({ example: 'user-123' })
  @Property()
  userId!: string;

  @ApiProperty({ example: 'Hello, world!' })
  @Property()
  text!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
