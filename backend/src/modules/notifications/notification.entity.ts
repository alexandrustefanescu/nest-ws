import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import type { NotificationType } from '@repo/shared-types';
import { SocialPost } from '../social/social-post.entity';

@Entity({ tableName: 'notifications' })
export class Notification {
  @PrimaryKey()
  id!: number;

  @Property()
  recipientId!: string;

  @Property()
  actorId!: string;

  @Property({ columnType: 'text' })
  type!: NotificationType;

  @ManyToOne(() => SocialPost, { deleteRule: 'cascade' })
  post!: SocialPost;

  @Property({ default: false })
  read: boolean = false;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
