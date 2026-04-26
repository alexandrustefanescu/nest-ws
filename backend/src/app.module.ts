import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { Room } from './entities/room.entity';
import { RoomUser } from './entities/room-user.entity';
import { Message } from './entities/message.entity';
import { TypingStatus } from './entities/typing-status.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { RoomService } from './services/room.service';
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
    ChatService,
    RoomService,
    WsThrottlerGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
