import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { MessagingModule } from '../messaging/messaging.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [MessagingModule, PresenceModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
