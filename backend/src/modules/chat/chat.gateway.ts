import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit, UseFilters, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { RoomsService } from '../rooms/rooms.service';
import { MessagesService } from '../messaging/messages.service';
import { ReactionsService } from '../messaging/reactions.service';
import { PresenceService } from '../presence/presence.service';
import { TypingService } from '../presence/typing.service';
import { WsThrottlerGuard, WsThrottle } from '../../common/guards/ws-throttler.guard';
import { WsExceptionFilter } from '../../common/filters/ws-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { JoinRoomDto, LeaveRoomDto } from '../presence/dto/join-room.dto';
import { SendMessageDto } from '../messaging/dto/send-message.dto';
import { TypingDto } from '../presence/dto/typing.dto';
import { CreateRoomDto } from '../rooms/dto/create-room.dto';
import { DeleteRoomDto } from '../rooms/dto/delete-room.dto';
import { ToggleReactionDto } from '../messaging/dto/toggle-reaction.dto';
import { DeleteMessageDto } from '../messaging/dto/delete-message.dto';
import { LoadMoreDto } from '../messaging/dto/load-more.dto';
import { ClearChatDto } from '../messaging/dto/clear-chat.dto';
import { Message } from '../messaging/message.entity';
import { ConnectionRegistry } from './connection-registry';
import { env } from '../../config/env';

@WebSocketGateway({
  cors: {
    origin: env.corsOrigin,
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@UseFilters(new WsExceptionFilter())
@UseInterceptors(new LoggingInterceptor())
export class ChatGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly registry = new ConnectionRegistry();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
    private readonly reactionsService: ReactionsService,
    private readonly presenceService: PresenceService,
    private readonly typingService: TypingService,
    private readonly wsThrottlerGuard: WsThrottlerGuard,
  ) {}

  async onModuleInit() {
    await this.presenceService.clearPresence();
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const rooms = await this.roomsService.getAllRooms();
    client.emit('rooms:list', rooms);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const joinedRooms = [...this.registry.roomsForClient(client.id)];
    if (joinedRooms.length === 0) {
      return;
    }

    for (const [roomId, userId] of joinedRooms) {
      const userLeft = this.registry.untrack(client.id, roomId, userId);
      if (userLeft) {
        await this.presenceService.removeUserFromRoom(roomId, userId);
        await this.emitUserLeft(roomId, userId);
      }
    }
    this.registry.evict(client.id);
    this.wsThrottlerGuard.evict(client.id);
  }

  @WsThrottle(10, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const { roomId, userId } = data;

    const room = await this.roomsService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }

    await this.presenceService.addUserToRoom(roomId, userId);
    client.join(`room-${roomId}`);
    const userJoinedRoom = this.registry.track(client.id, roomId, userId);

    if (userJoinedRoom) {
      this.server.to(`room-${roomId}`).emit('user:joined', {
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    const users = await this.presenceService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', { roomId, users });

    const snapshot = await this.reactionsService.getReactionsForRoom(roomId);
    client.emit('reactions:snapshot', snapshot);

    const history = await this.messagesService.getMessageHistory(roomId);
    client.emit('messages:history', {
      roomId,
      messages: history,
      hasMore: history.length === 50,
    });
  }

  @WsThrottle(20, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const { roomId, userId, text } = data;

    const room = await this.roomsService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }

    const message = await this.messagesService.saveMessage(roomId, userId, text);

    this.server.to(`room-${roomId}`).emit('message:new', {
      id: message.id,
      roomId,
      userId,
      text,
      createdAt: message.createdAt,
    });
  }

  @WsThrottle(60, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingDto,
  ) {
    const { roomId, userId } = data;

    await this.typingService.markUserTyping(roomId, userId);

    client.to(`room-${roomId}`).emit('user:typing', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  @WsThrottle(60, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingDto,
  ) {
    const { roomId, userId } = data;

    await this.typingService.removeUserTyping(roomId, userId);

    client.to(`room-${roomId}`).emit('user:typing-stopped', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  @WsThrottle(5, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('room:create')
  async handleCreateRoom(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: CreateRoomDto,
  ) {
    const room = await this.roomsService.createRoom(data.name);
    const allRooms = await this.roomsService.getAllRooms();
    this.server.emit('rooms:list', allRooms);
    return room;
  }

  @WsThrottle(5, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('room:delete')
  async handleDeleteRoom(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: DeleteRoomDto,
  ) {
    const { roomId } = data;
    const room = await this.roomsService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }
    await this.messagesService.clearRoomMessages(roomId);
    await this.presenceService.clearRoomPresence(roomId);
    await this.typingService.clearRoomTyping(roomId);
    await this.roomsService.deleteRoom(roomId);
    const allRooms = await this.roomsService.getAllRooms();
    this.server.emit('rooms:list', allRooms);
  }

  @WsThrottle(30, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('reaction:toggle')
  async handleToggleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ToggleReactionDto,
  ) {
    const { roomId, messageId, userId, emoji } = data;
    const reactions = await this.reactionsService.toggleReaction(messageId, userId, emoji);
    this.server.to(`room-${roomId}`).emit('reaction:updated', { messageId, reactions });
  }

  @WsThrottle(10, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveRoomDto,
  ) {
    const { roomId, userId } = data;

    client.leave(`room-${roomId}`);
    const userLeft = this.registry.untrack(client.id, roomId, userId);
    if (userLeft) {
      await this.presenceService.removeUserFromRoom(roomId, userId);
      await this.emitUserLeft(roomId, userId);
    }
  }

  @WsThrottle(20, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('messages:load-more')
  async handleLoadMore(
    @MessageBody() data: LoadMoreDto,
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const { roomId, before } = data;
    const messages = await this.messagesService.getMessageHistory(roomId, before);
    return { messages, hasMore: messages.length === 50 };
  }

  @WsThrottle(20, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeleteMessageDto,
  ): Promise<void> {
    const { roomId, messageId, userId } = data;
    await this.messagesService.deleteMessage(messageId, userId);
    this.server.to(`room-${roomId}`).emit('message:deleted', { roomId, messageId });
  }

  @WsThrottle(10, 60000)
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('chat:clear')
  async handleClearChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClearChatDto,
  ): Promise<void> {
    const { roomId } = data;
    await this.messagesService.clearRoomMessages(roomId);
    this.server.to(`room-${roomId}`).emit('chat:cleared', { roomId });
  }

  private async emitUserLeft(roomId: number, userId: string): Promise<void> {
    this.server.to(`room-${roomId}`).emit('user:left', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const users = await this.presenceService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', { roomId, users });
  }
}
