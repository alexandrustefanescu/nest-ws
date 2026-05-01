import { Body, Controller, ForbiddenException, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserProfilesService } from './user-profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListProfileFeedDto } from './dto/list-profile-feed.dto';

@ApiTags('profiles')
@Controller('api/profiles')
export class UserProfilesController {
  constructor(private readonly svc: UserProfilesService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Param('userId') userId: string) {
    const profile = await this.svc.getOrCreate(userId);
    return { userId: profile.userId, displayName: profile.displayName, bio: profile.bio };
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update own profile (requestingUserId must match userId)' })
  @ApiQuery({ name: 'requestingUserId', type: String })
  async updateProfile(
    @Param('userId') userId: string,
    @Query('requestingUserId') requestingUserId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    if (requestingUserId !== userId) throw new ForbiddenException('Cannot edit another user\'s profile');
    const profile = await this.svc.update(userId, dto);
    return { userId: profile.userId, displayName: profile.displayName, bio: profile.bio };
  }

  @Get(':userId/posts')
  @ApiOperation({ summary: 'List posts authored by a user' })
  async getUserPosts(@Param('userId') userId: string, @Query() dto: ListProfileFeedDto) {
    const posts = await this.svc.getUserPosts(userId, dto.before, dto.limit);
    return { posts, hasMore: posts.length === (dto.limit ?? 20) };
  }

  @Get(':userId/replies')
  @ApiOperation({ summary: 'List posts the user has commented on' })
  async getUserReplies(@Param('userId') userId: string, @Query() dto: ListProfileFeedDto) {
    const posts = await this.svc.getUserReplies(userId, dto.before, dto.limit);
    return { posts, hasMore: posts.length === (dto.limit ?? 20) };
  }
}
