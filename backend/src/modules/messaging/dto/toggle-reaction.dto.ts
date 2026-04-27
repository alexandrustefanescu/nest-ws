import { IsIn, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { ToggleReactionRequest } from '@repo/shared-types';

export const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

export class ToggleReactionDto implements ToggleReactionRequest {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roomId!: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  @IsPositive()
  messageId!: number;

  @ApiProperty({ example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;

  @ApiProperty({ example: '👍', enum: ALLOWED_REACTIONS })
  @IsString()
  @IsIn(ALLOWED_REACTIONS as readonly string[])
  emoji!: string;
}
