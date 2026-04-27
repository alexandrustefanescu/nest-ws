import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { TypingRequest } from '@repo/shared-types';

export class TypingDto implements TypingRequest {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roomId!: number;

  @ApiProperty({ example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;
}
