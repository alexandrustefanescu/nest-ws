import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JoinRoomDto } from '../modules/presence/dto/join-room.dto';
import { SendMessageDto } from '../modules/messaging/dto/send-message.dto';
import { TypingDto } from '../modules/presence/dto/typing.dto';
import {
  RoomsListEventDto,
  UserJoinedEventDto,
  UsersListEventDto,
  MessageNewEventDto,
  UserTypingEventDto,
  UserLeftEventDto,
  WsInfoResponseDto,
} from '../dto/ws-events.dto';

const WS_NOTE = 'WebSocket event — connect via Socket.IO at ws://localhost:3000';

@ApiTags('websocket-events')
@Controller('ws')
export class WsDocsController {
  @Get('connection')
  @ApiOperation({
    summary: 'Connect',
    description: `**Event:** connect\n\n${WS_NOTE}\n\nOn connect the server immediately emits **rooms:list** with all available rooms.`,
  })
  @ApiResponse({ status: 200, type: RoomsListEventDto, description: 'Server emits: rooms:list' })
  connection(): WsInfoResponseDto {
    return { message: WS_NOTE };
  }

  @Post('room-join')
  @HttpCode(200)
  @ApiOperation({
    summary: 'room:join',
    description: `**Event:** room:join\n\n${WS_NOTE}\n\nJoin a chat room. Server emits **user:joined** and **users:list** to all members of the room.`,
  })
  @ApiBody({ type: JoinRoomDto })
  @ApiResponse({ status: 200, type: UserJoinedEventDto, description: 'Server emits: user:joined (to room)' })
  @ApiResponse({ status: 200, type: UsersListEventDto, description: 'Server emits: users:list (to room)' })
  roomJoin(): WsInfoResponseDto {
    return { message: WS_NOTE };
  }

  @Post('room-leave')
  @HttpCode(200)
  @ApiOperation({
    summary: 'room:leave',
    description: `**Event:** room:leave\n\n${WS_NOTE}\n\nLeave a chat room. Server emits **user:left** and **users:list** to remaining room members.`,
  })
  @ApiBody({ type: JoinRoomDto })
  @ApiResponse({ status: 200, type: UserLeftEventDto, description: 'Server emits: user:left (to room)' })
  @ApiResponse({ status: 200, type: UsersListEventDto, description: 'Server emits: users:list (to room)' })
  roomLeave(): WsInfoResponseDto {
    return { message: WS_NOTE };
  }

  @Post('message-send')
  @HttpCode(200)
  @ApiOperation({
    summary: 'message:send',
    description: `**Event:** message:send\n\n${WS_NOTE}\n\nSend a message to a room. Server broadcasts **message:new** to all room members.`,
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 200, type: MessageNewEventDto, description: 'Server emits: message:new (to room)' })
  messageSend(): WsInfoResponseDto {
    return { message: WS_NOTE };
  }

  @Post('typing-start')
  @HttpCode(200)
  @ApiOperation({
    summary: 'typing:start',
    description: `**Event:** typing:start\n\n${WS_NOTE}\n\nNotify the room that the user started typing. Server emits **user:typing** to other room members. Typing status expires after 5 seconds.`,
  })
  @ApiBody({ type: TypingDto })
  @ApiResponse({ status: 200, type: UserTypingEventDto, description: 'Server emits: user:typing (to other room members)' })
  typingStart(): WsInfoResponseDto {
    return { message: WS_NOTE };
  }

  @Post('typing-stop')
  @HttpCode(200)
  @ApiOperation({
    summary: 'typing:stop',
    description: `**Event:** typing:stop\n\n${WS_NOTE}\n\nNotify the room that the user stopped typing. Server emits **user:typing-stopped** to other room members.`,
  })
  @ApiBody({ type: TypingDto })
  @ApiResponse({ status: 200, type: UserTypingEventDto, description: 'Server emits: user:typing-stopped (to other room members)' })
  typingStop(): WsInfoResponseDto {
    return { message: WS_NOTE };
  }
}
