import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { LoadMoreRequest } from '@repo/shared-types';

export class LoadMoreDto implements LoadMoreRequest {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roomId!: number;

  @ApiProperty({ example: 100, description: 'Fetch messages with id < before' })
  @IsInt()
  @IsPositive()
  before!: number;
}
