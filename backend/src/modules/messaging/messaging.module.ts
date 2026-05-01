import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ReactionsService } from './reactions.service';
import { PostsController } from './posts.controller';

@Module({
  controllers: [PostsController],
  providers: [MessagesService, ReactionsService],
  exports: [MessagesService, ReactionsService],
})
export class MessagingModule {}
