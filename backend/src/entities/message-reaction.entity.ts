import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Message } from './message.entity';

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class MessageReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @Column()
  userId: string;

  @Column()
  emoji: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
