import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostScope } from '../social-post.entity';

export const DEFAULT_SOCIAL_POSTS_LIMIT = 20;
export const MAX_SOCIAL_POSTS_LIMIT = 100;

export class ListSocialPostsDto {
  @ApiPropertyOptional({ example: 100, description: 'Fetch posts with id < before' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  before?: number;

  @ApiPropertyOptional({
    example: DEFAULT_SOCIAL_POSTS_LIMIT,
    description: `Maximum posts to return (default ${DEFAULT_SOCIAL_POSTS_LIMIT}, max ${MAX_SOCIAL_POSTS_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SOCIAL_POSTS_LIMIT)
  limit?: number;
}

export class SocialPostSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: PostScope, example: PostScope.Global })
  scope!: PostScope;

  @ApiProperty({ example: 1, nullable: true })
  roomId!: number | null;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ example: 'Shipped the first milestone' })
  title!: string;

  @ApiProperty({ example: 'We now have a real global feed direction and a phased rollout plan.' })
  body!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: 0 })
  commentCount!: number;

  @ApiProperty({ example: 0 })
  likeCount!: number;
}

export class GlobalSocialFeedResponseDto {
  @ApiProperty({ type: [SocialPostSummaryDto] })
  posts!: SocialPostSummaryDto[];

  @ApiProperty({ example: false })
  hasMore!: boolean;
}

export class RoomSocialFeedResponseDto {
  @ApiProperty({ example: 1 })
  roomId!: number;

  @ApiProperty({ type: [SocialPostSummaryDto] })
  posts!: SocialPostSummaryDto[];

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
