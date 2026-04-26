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
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import { RoomService } from '../services/room.service';
import { WsExceptionFilter } from '../filters/ws-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { JoinRoomPipe, SendMessagePipe, TypingPipe } from '../pipes';

const ALLOWED_REACTIONS = new Set(['👍', '❤️', '😂', '😮', '😢', '🔥']);

@WebSocketGateway({ cors: { origin: '*' } })
@UseFilters(new WsExceptionFilter())
@UseInterceptors(new LoggingInterceptor())
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientRooms = new Map<string, { roomId: number; userId: string }>();

  constructor(
    private readonly chatService: ChatService,
    private readonly roomService: RoomService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const rooms = await this.roomService.getAllRooms();
    client.emit('rooms:list', rooms);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const clientData = this.clientRooms.get(client.id);
    if (clientData) {
      const { roomId, userId } = clientData;
      this.clientRooms.delete(client.id);
      await this.chatService.removeUserFromRoom(roomId, userId);
      const users = await this.chatService.getUsersInRoom(roomId);
      this.server.to(`room-${roomId}`).emit('user:left', {
        userId,
        timestamp: new Date().toISOString(),
      });
      this.server.to(`room-${roomId}`).emit('users:list', users);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(new JoinRoomPipe()) data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }

    await this.chatService.addUserToRoom(roomId, userId);
    client.join(`room-${roomId}`);
    this.clientRooms.set(client.id, { roomId, userId });

    this.server.to(`room-${roomId}`).emit('user:joined', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const users = await this.chatService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', users);

    const snapshot = await this.chatService.getReactionsForRoom(roomId);
    client.emit('reactions:snapshot', snapshot);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody(new SendMessagePipe()) data: { roomId: number; userId: string; text: string },
  ) {
    const { roomId, userId, text } = data;

    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }

    const message = await this.chatService.saveMessage(roomId, userId, text);

    this.server.to(`room-${roomId}`).emit('message:new', {
      id: message.id,
      roomId,
      userId,
      text,
      createdAt: message.createdAt,
    });
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody(new TypingPipe()) data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    await this.chatService.markUserTyping(roomId, userId);

    client.to(`room-${roomId}`).emit('user:typing', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody(new TypingPipe()) data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    await this.chatService.removeUserTyping(roomId, userId);

    client.to(`room-${roomId}`).emit('user:typing-stopped', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('room:create')
  async handleCreateRoom(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { name: string },
  ) {
    const name = (data?.name ?? '').trim();
    if (!name) {
      throw new WsException('Room name is required');
    }
    const room = await this.roomService.createRoom(name);
    const allRooms = await this.roomService.getAllRooms();
    this.server.emit('rooms:list', allRooms);
    return room;
  }

  @SubscribeMessage('room:delete')
  async handleDeleteRoom(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    const roomId = typeof data?.roomId === 'number' && Number.isInteger(data.roomId) && data.roomId > 0
      ? data.roomId
      : null;
    if (roomId === null) {
      throw new WsException('roomId is required');
    }
    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new WsException('Room not found');
    }
    await this.chatService.clearRoomData(roomId);
    await this.roomService.deleteRoom(roomId);
    const allRooms = await this.roomService.getAllRooms();
    this.server.emit('rooms:list', allRooms);
  }

  @SubscribeMessage('reaction:toggle')
  async handleToggleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; messageId: number; userId: string; emoji: string },
  ) {
    const { roomId, messageId, userId, emoji } = data ?? {};
    if (!ALLOWED_REACTIONS.has(emoji)) {
      throw new WsException('Invalid emoji');
    }
    const reactions = await this.chatService.toggleReaction(messageId, userId, emoji);
    this.server.to(`room-${roomId}`).emit('reaction:updated', { messageId, reactions });
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(new JoinRoomPipe()) data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    await this.chatService.removeUserFromRoom(roomId, userId);
    client.leave(`room-${roomId}`);
    this.clientRooms.delete(client.id);

    this.server.to(`room-${roomId}`).emit('user:left', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const users = await this.chatService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', users);
  }
}
