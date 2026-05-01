import type { NotificationType } from '@repo/shared-types';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SocialPost } from '../social/social-post.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipientId: string;

  @Column()
  actorId: string;

  @Column({ type: 'text' })
  type: NotificationType;

  @Column()
  postId: number;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SocialPost, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'postId' })
  post: SocialPost;
}
