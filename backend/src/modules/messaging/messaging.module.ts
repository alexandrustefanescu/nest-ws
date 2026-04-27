import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessagesService } from './messages.service';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Message, MessageReaction])],
  providers: [MessagesService, ReactionsService],
  exports: [MessagesService, ReactionsService],
})
export class MessagingModule {}
