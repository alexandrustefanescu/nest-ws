import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PresenceModule } from '../presence/presence.module';
import { WsThrottlerGuard } from '../../common/guards/ws-throttler.guard';

@Module({
  imports: [RoomsModule, MessagingModule, PresenceModule],
  providers: [ChatGateway, WsThrottlerGuard],
})
export class ChatModule {}
