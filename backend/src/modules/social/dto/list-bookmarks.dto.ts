import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_SOCIAL_POSTS_LIMIT,
  MAX_SOCIAL_POSTS_LIMIT,
  SocialPostSummaryDto,
} from './list-social-posts.dto';

export class ListBookmarksDto {
  @ApiProperty({ example: 'user-123', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;

  @ApiPropertyOptional({ example: 100, description: 'Fetch bookmarks with id < before' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  before?: number;

  @ApiPropertyOptional({ example: DEFAULT_SOCIAL_POSTS_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SOCIAL_POSTS_LIMIT)
  limit?: number;
}

export class BookmarksFeedResponseDto {
  @ApiProperty({ type: [SocialPostSummaryDto] })
  posts!: SocialPostSummaryDto[];

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
