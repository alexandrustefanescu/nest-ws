import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { Room } from './modules/rooms/room.entity';
import { RoomUser } from './modules/presence/room-user.entity';
import { Message } from './modules/messaging/message.entity';
import { TypingStatus } from './modules/presence/typing-status.entity';
import { MessageReaction } from './modules/messaging/message-reaction.entity';
import { ChatGateway } from './gateways/chat.gateway';
import { RoomService } from './services/room.service';
import { MessagesService } from './modules/messaging/messages.service';
import { ReactionsService } from './modules/messaging/reactions.service';
import { PresenceService } from './modules/presence/presence.service';
import { TypingService } from './modules/presence/typing.service';
import { AppController } from './app.controller';
import { WsDocsController } from './controllers/ws-docs.controller';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { WsThrottlerGuard } from './guards/ws-throttler.guard';
import { RoomsController } from './controllers/rooms.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Room, RoomUser, Message, TypingStatus, MessageReaction]),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
      skipIf: (ctx) => ctx.getType() !== 'http',
    }),
  ],
  controllers: [AppController, WsDocsController, RoomsController],
  providers: [
    ChatGateway,
    RoomService,
    MessagesService,
    ReactionsService,
    PresenceService,
    TypingService,
    WsThrottlerGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
