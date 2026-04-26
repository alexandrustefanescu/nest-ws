import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('typing_status')
export class TypingStatus {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column()
  roomId: number;

  @ApiProperty({ example: 'user-123' })
  @Column()
  userId: string;

  @ApiProperty({ example: '2024-01-01T00:00:05.000Z' })
  @Column({ type: 'datetime' })
  expiresAt: Date;
}
