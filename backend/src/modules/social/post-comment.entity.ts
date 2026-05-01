import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { SocialPost } from './social-post.entity';

@Entity({ tableName: 'post_comments' })
export class PostComment {
  @ApiProperty({ example: 1 })
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => SocialPost, { deleteRule: 'cascade' })
  post!: SocialPost;

  @ApiProperty({ example: 'user-123' })
  @Property()
  userId!: string;

  @ApiProperty({ example: 'Great post!' })
  @Property({ columnType: 'text' })
  body!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
