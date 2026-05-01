import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { SocialPost } from './social-post.entity';

@Entity({ tableName: 'post_bookmarks' })
@Unique({ properties: ['post', 'userId'] })
export class PostBookmark {
  @ApiProperty({ example: 1 })
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => SocialPost, { deleteRule: 'cascade' })
  post!: SocialPost;

  @ApiProperty({ example: 'user-123' })
  @Property()
  userId!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
