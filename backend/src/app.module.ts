import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { databaseConfig } from './database.config';
import { WsDocsController } from './controllers/ws-docs.controller';
import { HealthModule } from './health/health.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PresenceModule } from './modules/presence/presence.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
      skipIf: (ctx) => ctx.getType() !== 'http',
    }),
    RoomsModule,
    MessagingModule,
    PresenceModule,
    ChatModule,
    HealthModule,
  ],
  controllers: [WsDocsController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
