import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Message } from '../message.entity';

export const DEFAULT_POSTS_LIMIT = 50;
export const MAX_POSTS_LIMIT = 100;

export class ListPostsDto {
  @ApiPropertyOptional({ example: 100, description: 'Fetch posts with id < before' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  before?: number;

  @ApiPropertyOptional({
    example: DEFAULT_POSTS_LIMIT,
    description: `Maximum posts to return (default ${DEFAULT_POSTS_LIMIT}, max ${MAX_POSTS_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTS_LIMIT)
  limit?: number;
}

export class RoomPostsResponseDto {
  @ApiProperty({ example: 1 })
  roomId!: number;

  @ApiProperty({ type: [Message] })
  posts!: Message[];

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
