import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('typing_status')
export class TypingStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @Column()
  userId: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;
}
