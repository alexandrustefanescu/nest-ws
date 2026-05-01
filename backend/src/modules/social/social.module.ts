import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoomsModule } from '../rooms/rooms.module';
import { BookmarksController } from './bookmarks.controller';
import { PostBookmark } from './post-bookmark.entity';
import { PostComment } from './post-comment.entity';
import { PostLike } from './post-like.entity';
import { SocialEngagementService } from './social-engagement.service';
import { SocialPost } from './social-post.entity';
import { RoomSocialPostsController, SocialPostsController } from './social-posts.controller';
import { SocialPostsService } from './social-posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([SocialPost, PostComment, PostLike, PostBookmark]), RoomsModule, NotificationsModule],
  controllers: [SocialPostsController, RoomSocialPostsController, BookmarksController],
  providers: [SocialPostsService, SocialEngagementService],
  exports: [SocialPostsService, SocialEngagementService],
})
export class SocialModule {}
