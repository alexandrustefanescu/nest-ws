import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SocialPost } from '../social/social-post.entity';

export type NotificationType = 'like' | 'comment';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipientId: string;

  @Column()
  actorId: string;

  @Column()
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
