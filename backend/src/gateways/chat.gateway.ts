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
import { ChatService } from '../services/chat.service';
import { RoomService } from '../services/room.service';
import { MessagesService } from '../modules/messaging/messages.service';
import { ReactionsService } from '../modules/messaging/reactions.service';
import { WsThrottlerGuard, WsThrottle } from '../guards/ws-throttler.guard';
import { WsExceptionFilter } from '../filters/ws-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { JoinRoomDto, LeaveRoomDto } from '../modules/presence/dto/join-room.dto';
import { SendMessageDto } from '../modules/messaging/dto/send-message.dto';
import { TypingDto } from '../modules/presence/dto/typing.dto';
import { CreateRoomDto } from '../modules/rooms/dto/create-room.dto';
import { DeleteRoomDto } from '../modules/rooms/dto/delete-room.dto';
import { ToggleReactionDto } from '../modules/messaging/dto/toggle-reaction.dto';
import { DeleteMessageDto } from '../modules/messaging/dto/delete-message.dto';
import { LoadMoreDto } from '../modules/messaging/dto/load-more.dto';
import { ClearChatDto } from '../modules/messaging/dto/clear-chat.dto';
import { Message } from '../modules/messaging/message.entity';

type ClientRooms = Map<number, string>;
type RoomUserSockets = Map<string, Set<string>>;

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@UseFilters(new WsExceptionFilter())
@UseInterceptors(new LoggingInterceptor())
export class ChatGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly clientRooms = new Map<string, ClientRooms>();
  private readonly roomUserSockets = new Map<number, RoomUserSockets>();

  constructor(
    private readonly chatService: ChatService,
    private readonly roomService: RoomService,
    private readonly messagesService: MessagesService,
    private readonly reactionsService: ReactionsService,
    private readonly wsThrottlerGuard: WsThrottlerGuard,
  ) {}

  async onModuleInit() {
    await this.chatService.clearPresence();
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const rooms = await this.roomService.getAllRooms();
    client.emit('rooms:list', rooms);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const joinedRooms = this.clientRooms.get(client.id);
    if (!joinedRooms) {
      return;
    }

    for (const [roomId, userId] of joinedRooms) {
      const userLeftRoom = await this.untrackClientRoom(client.id, roomId, userId);
      if (userLeftRoom) {
        await this.emitUserLeft(roomId, userId);
      }
    }
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

    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }

    await this.chatService.addUserToRoom(roomId, userId);
    client.join(`room-${roomId}`);
    const userJoinedRoom = this.trackClientRoom(client.id, roomId, userId);

    if (userJoinedRoom) {
      this.server.to(`room-${roomId}`).emit('user:joined', {
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    const users = await this.chatService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', users);

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

    const room = await this.roomService.getRoomById(roomId);
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

    await this.chatService.markUserTyping(roomId, userId);

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

    await this.chatService.removeUserTyping(roomId, userId);

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
    const room = await this.roomService.createRoom(data.name);
    const allRooms = await this.roomService.getAllRooms();
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
    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }
    await this.chatService.clearRoomData(roomId);
    await this.roomService.deleteRoom(roomId);
    const allRooms = await this.roomService.getAllRooms();
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
    const userLeftRoom = await this.untrackClientRoom(client.id, roomId, userId);
    if (userLeftRoom) {
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

  private trackClientRoom(clientId: string, roomId: number, userId: string): boolean {
    const clientRooms = this.getOrCreateClientRooms(clientId);
    const previousUserId = clientRooms.get(roomId);
    if (previousUserId === userId) {
      return false;
    }
    if (previousUserId) {
      this.removeClientSocketFromRoom(clientId, roomId, previousUserId);
    }

    clientRooms.set(roomId, userId);
    const userSockets = this.getOrCreateUserSockets(roomId, userId);
    const wasOffline = userSockets.size === 0;
    userSockets.add(clientId);

    return wasOffline;
  }

  private async untrackClientRoom(
    clientId: string,
    roomId: number,
    userId: string,
  ): Promise<boolean> {
    const clientRooms = this.clientRooms.get(clientId);
    if (clientRooms?.get(roomId) === userId) {
      clientRooms.delete(roomId);
      if (clientRooms.size === 0) {
        this.clientRooms.delete(clientId);
      }
    }

    const userStillPresent = this.removeClientSocketFromRoom(clientId, roomId, userId);
    if (userStillPresent) {
      return false;
    }

    await this.chatService.removeUserFromRoom(roomId, userId);
    return true;
  }

  private removeClientSocketFromRoom(clientId: string, roomId: number, userId: string): boolean {
    const roomUsers = this.roomUserSockets.get(roomId);
    const userSockets = roomUsers?.get(userId);
    if (!roomUsers || !userSockets) {
      return false;
    }

    userSockets.delete(clientId);
    if (userSockets.size > 0) {
      return true;
    }

    roomUsers.delete(userId);
    if (roomUsers.size === 0) {
      this.roomUserSockets.delete(roomId);
    }
    return false;
  }

  private getOrCreateClientRooms(clientId: string): ClientRooms {
    const existing = this.clientRooms.get(clientId);
    if (existing) {
      return existing;
    }

    const clientRooms = new Map<number, string>();
    this.clientRooms.set(clientId, clientRooms);
    return clientRooms;
  }

  private getOrCreateUserSockets(roomId: number, userId: string): Set<string> {
    let roomUsers = this.roomUserSockets.get(roomId);
    if (!roomUsers) {
      roomUsers = new Map<string, Set<string>>();
      this.roomUserSockets.set(roomId, roomUsers);
    }

    let userSockets = roomUsers.get(userId);
    if (!userSockets) {
      userSockets = new Set<string>();
      roomUsers.set(userId, userSockets);
    }

    return userSockets;
  }

  private async emitUserLeft(roomId: number, userId: string): Promise<void> {
    this.server.to(`room-${roomId}`).emit('user:left', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const users = await this.chatService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', users);
  }
}
