import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from '../rooms/rooms.service';
import { CreatePostCommentDto, PostCommentsResponseDto } from './dto/create-post-comment.dto';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import {
  DEFAULT_SOCIAL_POSTS_LIMIT,
  GlobalSocialFeedResponseDto,
  ListSocialPostsDto,
  RoomSocialFeedResponseDto,
  SocialPostSummaryDto,
} from './dto/list-social-posts.dto';
import { ToggleBookmarkDto, ToggleBookmarkResponseDto } from './dto/toggle-bookmark.dto';
import { TogglePostLikeDto, TogglePostLikeResponseDto } from './dto/toggle-post-like.dto';
import { PostComment } from './post-comment.entity';
import { SocialEngagementService } from './social-engagement.service';
import { SocialPost } from './social-post.entity';
import { SocialPostsService } from './social-posts.service';

@ApiTags('posts')
@Controller('api/posts')
export class SocialPostsController {
  constructor(
    private readonly socialPostsService: SocialPostsService,
    private readonly socialEngagementService: SocialEngagementService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get global social feed posts' })
  @ApiResponse({ status: 200, type: GlobalSocialFeedResponseDto, description: 'Paginated global post feed' })
  async listGlobalPosts(@Query() query: ListSocialPostsDto): Promise<GlobalSocialFeedResponseDto> {
    const limit = query.limit !== undefined ? Number(query.limit) : DEFAULT_SOCIAL_POSTS_LIMIT;
    const before = query.before !== undefined ? Number(query.before) : undefined;
    const posts = await this.socialPostsService.getGlobalFeed(before, limit);

    return {
      posts: await this.attachEngagement(posts),
      hasMore: posts.length === limit,
    };
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get a single social post by id' })
  @ApiResponse({ status: 200, type: SocialPostSummaryDto, description: 'Single structured social post with engagement counts' })
  async getPost(@Param('postId', ParseIntPipe) postId: number): Promise<SocialPostSummaryDto> {
    const post = await this.socialPostsService.getPostById(postId);
    const [summary] = await this.attachEngagement([post]);
    return summary;
  }

  @Post()
  @ApiOperation({ summary: 'Create a global social post' })
  @ApiResponse({ status: 201, type: SocialPost, description: 'Created global post' })
  async createGlobalPost(@Body() dto: CreateSocialPostDto): Promise<SocialPost> {
    return this.socialPostsService.createGlobalPost(dto.userId, dto.title, dto.body);
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'List flat comments for a social post' })
  @ApiResponse({ status: 200, type: PostCommentsResponseDto, description: 'Flat comment thread for the post' })
  async listComments(@Param('postId', ParseIntPipe) postId: number): Promise<PostCommentsResponseDto> {
    const comments = await this.socialEngagementService.listComments(postId);
    return { postId, comments };
  }

  @Post(':postId/comments')
  @ApiOperation({ summary: 'Create a flat comment for a social post' })
  @ApiResponse({ status: 201, type: PostComment, description: 'Created flat post comment' })
  async createComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreatePostCommentDto,
  ): Promise<PostComment> {
    return this.socialEngagementService.createComment(postId, dto.userId, dto.body);
  }

  @Post(':postId/likes/toggle')
  @ApiOperation({ summary: 'Toggle like for a social post' })
  @ApiResponse({ status: 201, type: TogglePostLikeResponseDto, description: 'Like state after toggle' })
  async toggleLike(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: TogglePostLikeDto,
  ): Promise<TogglePostLikeResponseDto> {
    return this.socialEngagementService.toggleLike(postId, dto.userId);
  }

  @Post(':postId/bookmark')
  @ApiOperation({ summary: 'Toggle bookmark for a social post' })
  @ApiResponse({ status: 201, type: ToggleBookmarkResponseDto, description: 'Bookmark state after toggle' })
  async toggleBookmark(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: ToggleBookmarkDto,
  ): Promise<ToggleBookmarkResponseDto> {
    return this.socialEngagementService.toggleBookmark(postId, dto.userId);
  }

  private async attachEngagement(posts: SocialPost[]): Promise<SocialPostSummaryDto[]> {
    const engagement = await this.socialEngagementService.getEngagementForPosts(posts.map((post) => post.id));
    return posts.map((post) => ({
      ...post,
      commentCount: engagement[post.id]?.commentCount ?? 0,
      likeCount: engagement[post.id]?.likeCount ?? 0,
    }));
  }
}

@ApiTags('rooms')
@Controller('api/rooms/:roomId/social-posts')
export class RoomSocialPostsController {
  constructor(
    private readonly socialPostsService: SocialPostsService,
    private readonly socialEngagementService: SocialEngagementService,
    private readonly roomsService: RoomsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get room-scoped social posts' })
  @ApiResponse({ status: 200, type: RoomSocialFeedResponseDto, description: 'Paginated community post feed' })
  async listRoomPosts(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() query: ListSocialPostsDto,
  ): Promise<RoomSocialFeedResponseDto> {
    await this.ensureRoomExists(roomId);

    const limit = query.limit !== undefined ? Number(query.limit) : DEFAULT_SOCIAL_POSTS_LIMIT;
    const before = query.before !== undefined ? Number(query.before) : undefined;
    const posts = await this.socialPostsService.getRoomFeed(roomId, before, limit);

    return {
      roomId,
      posts: await this.attachEngagement(posts),
      hasMore: posts.length === limit,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a room-scoped social post' })
  @ApiResponse({ status: 201, type: SocialPost, description: 'Created community post' })
  async createRoomPost(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: CreateSocialPostDto,
  ): Promise<SocialPost> {
    await this.ensureRoomExists(roomId);
    return this.socialPostsService.createRoomPost(roomId, dto.userId, dto.title, dto.body);
  }

  private async attachEngagement(posts: SocialPost[]): Promise<SocialPostSummaryDto[]> {
    const engagement = await this.socialEngagementService.getEngagementForPosts(posts.map((post) => post.id));
    return posts.map((post) => ({
      ...post,
      commentCount: engagement[post.id]?.commentCount ?? 0,
      likeCount: engagement[post.id]?.likeCount ?? 0,
    }));
  }

  private async ensureRoomExists(roomId: number): Promise<void> {
    const room = await this.roomsService.getRoomById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }
  }
}
