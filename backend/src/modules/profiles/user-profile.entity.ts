import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_profiles')
export class UserProfile {
  @ApiProperty({ example: 'alex' })
  @PrimaryColumn()
  userId: string;

  @ApiProperty({ example: 'Alex S.', nullable: true })
  @Column({ nullable: true, length: 60 })
  displayName: string | null;

  @ApiProperty({ example: 'Building things.', nullable: true })
  @Column({ type: 'text', nullable: true })
  bio: string | null;
}
