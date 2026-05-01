import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ tableName: 'typing_status' })
export class TypingStatus {
  @ApiProperty({ example: 1 })
  @PrimaryKey()
  id!: number;

  @ApiProperty({ example: 1 })
  @Property()
  roomId!: number;

  @ApiProperty({ example: 'user-123' })
  @Property()
  userId!: string;

  @ApiProperty({ example: '2024-01-01T00:00:05.000Z' })
  @Property({ columnType: 'datetime' })
  expiresAt!: Date;
}
