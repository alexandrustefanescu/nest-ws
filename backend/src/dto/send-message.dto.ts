import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { SendMessageRequest } from '@repo/shared-types';

export class SendMessageDto implements SendMessageRequest {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roomId!: number;

  @ApiProperty({ example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;

  @ApiProperty({ example: 'Hello, world!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;
}
