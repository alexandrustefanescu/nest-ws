import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoomsModule } from '../rooms/rooms.module';
import { BookmarksController } from './bookmarks.controller';
import { SocialEngagementService } from './social-engagement.service';
import { RoomSocialPostsController, SocialPostsController } from './social-posts.controller';
import { SocialPostsService } from './social-posts.service';

@Module({
  imports: [RoomsModule, NotificationsModule],
  controllers: [SocialPostsController, RoomSocialPostsController, BookmarksController],
  providers: [SocialPostsService, SocialEngagementService],
  exports: [SocialPostsService, SocialEngagementService],
})
export class SocialModule {}
