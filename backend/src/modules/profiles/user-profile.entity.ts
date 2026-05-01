import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ tableName: 'user_profiles' })
export class UserProfile {
  @ApiProperty({ example: 'alex' })
  @PrimaryKey()
  userId!: string;

  @ApiProperty({ example: 'Alex S.', nullable: true })
  @Property({ nullable: true, length: 60 })
  displayName: string | null = null;

  @ApiProperty({ example: 'Building things.', nullable: true })
  @Property({ columnType: 'text', nullable: true })
  bio: string | null = null;
}
