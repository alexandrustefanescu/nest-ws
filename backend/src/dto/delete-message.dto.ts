import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { DeleteMessageRequest } from '@repo/shared-types';

export class DeleteMessageDto implements DeleteMessageRequest {
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
}
