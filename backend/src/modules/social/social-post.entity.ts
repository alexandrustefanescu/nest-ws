import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Room } from '../rooms/room.entity';

export enum PostScope {
  Global = 'global',
  Room = 'room',
}

@Entity({ tableName: 'social_posts' })
export class SocialPost {
  @ApiProperty({ example: 1 })
  @PrimaryKey()
  id!: number;

  @ApiProperty({ enum: PostScope, example: PostScope.Global })
  @Enum(() => PostScope)
  scope!: PostScope;

  @ManyToOne(() => Room, { nullable: true, deleteRule: 'cascade' })
  room: Room | null = null;

  @ApiProperty({ example: 'user-123' })
  @Property()
  userId!: string;

  @ApiProperty({ example: 'Shipped the first milestone' })
  @Property()
  title!: string;

  @ApiProperty({ example: 'We now have a real global feed.' })
  @Property({ columnType: 'text' })
  body!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
