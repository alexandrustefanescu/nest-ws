import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { databaseConfig } from './config/database.config';
import { HealthModule } from './health/health.module';
import { DocsModule } from './modules/docs/docs.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PresenceModule } from './modules/presence/presence.module';
import { ChatModule } from './modules/chat/chat.module';
import { SocialModule } from './modules/social/social.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UserProfilesModule } from './modules/profiles/user-profiles.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 50 }],
      skipIf: (ctx) => ctx.getType() !== 'http',
    }),
    RoomsModule,
    MessagingModule,
    SocialModule,
    NotificationsModule,
    UserProfilesModule,
    PresenceModule,
    ChatModule,
    HealthModule,
    DocsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
