import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookmarksFeedResponseDto, ListBookmarksDto } from './dto/list-bookmarks.dto';
import { DEFAULT_SOCIAL_POSTS_LIMIT, SocialPostSummaryDto } from './dto/list-social-posts.dto';
import { SocialEngagementService } from './social-engagement.service';

@ApiTags('bookmarks')
@Controller('api/bookmarks')
export class BookmarksController {
  constructor(private readonly engagement: SocialEngagementService) {}

  @Get()
  @ApiOperation({ summary: 'List bookmarked social posts for a user' })
  @ApiResponse({ status: 200, type: BookmarksFeedResponseDto, description: 'Paginated bookmarks feed' })
  async listBookmarks(@Query() query: ListBookmarksDto): Promise<BookmarksFeedResponseDto> {
    const limit = query.limit !== undefined ? Number(query.limit) : DEFAULT_SOCIAL_POSTS_LIMIT;
    const before = query.before !== undefined ? Number(query.before) : undefined;

    const { posts, hasMore } = await this.engagement.listBookmarks(query.userId, before, limit);

    const engagementMap = await this.engagement.getEngagementForPosts(posts.map((p) => p.id));
    const enriched: SocialPostSummaryDto[] = posts.map((post) => ({
      ...post,
      commentCount: engagementMap[post.id]?.commentCount ?? 0,
      likeCount: engagementMap[post.id]?.likeCount ?? 0,
    }));

    return { posts: enriched, hasMore };
  }
}
