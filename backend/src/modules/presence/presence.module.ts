import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomUser } from './room-user.entity';
import { TypingStatus } from './typing-status.entity';
import { PresenceService } from './presence.service';
import { TypingService } from './typing.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomUser, TypingStatus])],
  providers: [PresenceService, TypingService],
  exports: [PresenceService, TypingService],
})
export class PresenceModule {}
