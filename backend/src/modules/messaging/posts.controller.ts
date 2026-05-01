import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { DEFAULT_POSTS_LIMIT, ListPostsDto, RoomPostsResponseDto } from './dto/list-posts.dto';

@ApiTags('rooms')
@Controller('api/rooms/:roomId/posts')
export class PostsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get room-scoped posts' })
  @ApiResponse({
    status: 200,
    type: RoomPostsResponseDto,
    description: 'Paginated room feed for text/emoji posts',
  })
  async listPosts(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() query: ListPostsDto,
  ): Promise<RoomPostsResponseDto> {
    const limit = query.limit !== undefined ? Number(query.limit) : DEFAULT_POSTS_LIMIT;
    const before = query.before !== undefined ? Number(query.before) : undefined;
    const posts = await this.messagesService.getRoomFeed(roomId, before, limit);

    return {
      roomId,
      posts,
      hasMore: posts.length === limit,
    };
  }
}
