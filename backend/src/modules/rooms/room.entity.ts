import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ tableName: 'rooms' })
export class Room {
  @ApiProperty({ example: 1 })
  @PrimaryKey()
  id!: number;

  @ApiProperty({ example: 'general' })
  @Property({ unique: true })
  name!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
