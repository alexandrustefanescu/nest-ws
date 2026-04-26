# WebSocket Chat Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time chat backend with rooms, presence tracking, and typing indicators using NestJS, Socket.io, Fastify, and SQLite.

**Architecture:** Single ChatGateway handling WebSocket events, three services (ChatService, RoomService, UserService) for business logic, SQLite for persistence, pipes for validation, interceptors for logging, exception filter for error handling.

**Tech Stack:** NestJS 11, Fastify, Socket.io, TypeORM, SQLite, TypeScript

---

## Task 1: Setup Fastify and Database Configuration

**Files:**
- Modify: `src/main.ts`
- Create: `src/database.config.ts`
- Create: `.env` (development)

**Step 1: Update main.ts to use Fastify adapter**

Replace the contents of `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  
  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
```

**Step 2: Create database configuration**

Create `src/database.config.ts`:

```typescript
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

export const databaseConfig: DataSourceOptions = {
  type: 'sqlite',
  database: process.env.DATABASE_PATH || 'chat.db',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};
```

**Step 3: Create .env file**

Create `.env`:

```
DATABASE_PATH=chat.db
NODE_ENV=development
PORT=3000
```

**Step 4: Verify Fastify is set up**

Run: `npm run start:dev`
Expected: App starts on http://localhost:3000 (no gateway yet, so HTTP will return 404)

**Step 5: Commit**

```bash
git add src/main.ts src/database.config.ts .env
git commit -m "setup: configure Fastify adapter and SQLite database"
```

---

## Task 2: Create Database Entities

**Files:**
- Create: `src/entities/room.entity.ts`
- Create: `src/entities/room-user.entity.ts`
- Create: `src/entities/message.entity.ts`
- Create: `src/entities/typing-status.entity.ts`

**Step 1: Create Room entity**

Create `src/entities/room.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Step 2: Create RoomUser entity (presence tracking)**

Create `src/entities/room-user.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity('room_users')
export class RoomUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @Column()
  userId: string;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;
}
```

**Step 3: Create Message entity**

Create `src/entities/message.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @Column()
  userId: string;

  @Column()
  text: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;
}
```

**Step 4: Create TypingStatus entity**

Create `src/entities/typing-status.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('typing_status')
export class TypingStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @Column()
  userId: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;
}
```

**Step 5: Verify entities load (TypeORM will auto-create tables)**

Run: `npm run start:dev`
Expected: `chat.db` file appears in project root; tables created

**Step 6: Commit**

```bash
git add src/entities/
git commit -m "feat: create database entities (Room, RoomUser, Message, TypingStatus)"
```

---

## Task 3: Create RoomService

**Files:**
- Create: `src/services/room.service.ts`
- Create: `src/services/room.service.spec.ts`

**Step 1: Write failing test for RoomService.getAllRooms()**

Create `src/services/room.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomService } from './room.service';
import { Room } from '../entities/room.entity';

describe('RoomService', () => {
  let service: RoomService;
  let mockRoomRepository;

  beforeEach(async () => {
    mockRoomRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: getRepositoryToken(Room), useValue: mockRoomRepository },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it('should return all rooms', async () => {
    const mockRooms = [
      { id: 1, name: 'general', createdAt: new Date() },
      { id: 2, name: 'random', createdAt: new Date() },
    ];
    mockRoomRepository.find.mockResolvedValue(mockRooms);

    const result = await service.getAllRooms();

    expect(result).toEqual(mockRooms);
    expect(mockRoomRepository.find).toHaveBeenCalled();
  });

  it('should return a room by id', async () => {
    const mockRoom = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomRepository.findOne.mockResolvedValue(mockRoom);

    const result = await service.getRoomById(1);

    expect(result).toEqual(mockRoom);
  });

  it('should create a new room', async () => {
    const mockRoom = { id: 1, name: 'new-room', createdAt: new Date() };
    mockRoomRepository.save.mockResolvedValue(mockRoom);

    const result = await service.createRoom('new-room');

    expect(result).toEqual(mockRoom);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/services/room.service.spec.ts`
Expected: FAIL - "RoomService is not defined"

**Step 3: Implement RoomService**

Create `src/services/room.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async getAllRooms(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  async getRoomById(id: number): Promise<Room> {
    return this.roomRepository.findOne({ where: { id } });
  }

  async createRoom(name: string): Promise<Room> {
    const room = this.roomRepository.create({ name });
    return this.roomRepository.save(room);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/services/room.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/room.service.ts src/services/room.service.spec.ts
git commit -m "feat: implement RoomService with getAllRooms, getRoomById, createRoom"
```

---

## Task 4: Create ChatService

**Files:**
- Create: `src/services/chat.service.ts`
- Create: `src/services/chat.service.spec.ts`

**Step 1: Write failing tests for ChatService**

Create `src/services/chat.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Message } from '../entities/message.entity';
import { RoomUser } from '../entities/room-user.entity';
import { TypingStatus } from '../entities/typing-status.entity';

describe('ChatService', () => {
  let service: ChatService;
  let mockMessageRepository;
  let mockRoomUserRepository;
  let mockTypingStatusRepository;

  beforeEach(async () => {
    mockMessageRepository = { save: jest.fn(), create: jest.fn() };
    mockRoomUserRepository = { find: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() };
    mockTypingStatusRepository = { save: jest.fn(), create: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepository },
        { provide: getRepositoryToken(RoomUser), useValue: mockRoomUserRepository },
        { provide: getRepositoryToken(TypingStatus), useValue: mockTypingStatusRepository },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should save a message', async () => {
    const mockMessage = { id: 1, roomId: 1, userId: 'user1', text: 'Hello', createdAt: new Date() };
    mockMessageRepository.create.mockReturnValue(mockMessage);
    mockMessageRepository.save.mockResolvedValue(mockMessage);

    const result = await service.saveMessage(1, 'user1', 'Hello');

    expect(result).toEqual(mockMessage);
  });

  it('should get users in a room', async () => {
    const mockUsers = [
      { id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() },
      { id: 2, roomId: 1, userId: 'user2', joinedAt: new Date() },
    ];
    mockRoomUserRepository.find.mockResolvedValue(mockUsers);

    const result = await service.getUsersInRoom(1);

    expect(result).toEqual(mockUsers);
  });

  it('should add user to room', async () => {
    const mockRoomUser = { id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() };
    mockRoomUserRepository.create.mockReturnValue(mockRoomUser);
    mockRoomUserRepository.save.mockResolvedValue(mockRoomUser);

    const result = await service.addUserToRoom(1, 'user1');

    expect(result).toEqual(mockRoomUser);
  });

  it('should remove user from room', async () => {
    mockRoomUserRepository.delete.mockResolvedValue({ affected: 1 });

    await service.removeUserFromRoom(1, 'user1');

    expect(mockRoomUserRepository.delete).toHaveBeenCalledWith({ roomId: 1, userId: 'user1' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/services/chat.service.spec.ts`
Expected: FAIL

**Step 3: Implement ChatService**

Create `src/services/chat.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { RoomUser } from '../entities/room-user.entity';
import { TypingStatus } from '../entities/typing-status.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(RoomUser)
    private roomUserRepository: Repository<RoomUser>,
    @InjectRepository(TypingStatus)
    private typingStatusRepository: Repository<TypingStatus>,
  ) {}

  async saveMessage(roomId: number, userId: string, text: string): Promise<Message> {
    const message = this.messageRepository.create({ roomId, userId, text });
    return this.messageRepository.save(message);
  }

  async getUsersInRoom(roomId: number): Promise<RoomUser[]> {
    return this.roomUserRepository.find({ where: { roomId } });
  }

  async addUserToRoom(roomId: number, userId: string): Promise<RoomUser> {
    const roomUser = this.roomUserRepository.create({ roomId, userId });
    return this.roomUserRepository.save(roomUser);
  }

  async removeUserFromRoom(roomId: number, userId: string): Promise<void> {
    await this.roomUserRepository.delete({ roomId, userId });
  }

  async markUserTyping(roomId: number, userId: string): Promise<TypingStatus> {
    const expiresAt = new Date(Date.now() + 5000); // 5 seconds
    const typingStatus = this.typingStatusRepository.create({ roomId, userId, expiresAt });
    return this.typingStatusRepository.save(typingStatus);
  }

  async removeUserTyping(roomId: number, userId: string): Promise<void> {
    await this.typingStatusRepository.delete({ roomId, userId });
  }

  async getTypingUsersInRoom(roomId: number): Promise<TypingStatus[]> {
    return this.typingStatusRepository.find({ where: { roomId } });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/services/chat.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/chat.service.ts src/services/chat.service.spec.ts
git commit -m "feat: implement ChatService with message and presence methods"
```

---

## Task 5: Create Validation Pipes

**Files:**
- Create: `src/pipes/join-room.pipe.ts`
- Create: `src/pipes/send-message.pipe.ts`
- Create: `src/pipes/typing.pipe.ts`

**Step 1: Create JoinRoomPipe**

Create `src/pipes/join-room.pipe.ts`:

```typescript
import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class JoinRoomPipe implements PipeTransform {
  transform(value: any) {
    if (!value.roomId) {
      throw new BadRequestException('roomId is required');
    }
    if (!value.userId) {
      throw new BadRequestException('userId is required');
    }
    return value;
  }
}
```

**Step 2: Create SendMessagePipe**

Create `src/pipes/send-message.pipe.ts`:

```typescript
import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class SendMessagePipe implements PipeTransform {
  transform(value: any) {
    if (!value.roomId) {
      throw new BadRequestException('roomId is required');
    }
    if (!value.text) {
      throw new BadRequestException('message text is required');
    }
    if (typeof value.text !== 'string' || value.text.length === 0) {
      throw new BadRequestException('message must be a non-empty string');
    }
    if (value.text.length > 500) {
      throw new BadRequestException('message must be less than 500 characters');
    }
    return value;
  }
}
```

**Step 3: Create TypingPipe**

Create `src/pipes/typing.pipe.ts`:

```typescript
import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class TypingPipe implements PipeTransform {
  transform(value: any) {
    if (!value.roomId) {
      throw new BadRequestException('roomId is required');
    }
    return value;
  }
}
```

**Step 4: Verify pipes are created (no tests needed for simple validation)**

Run: `npm run build`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src/pipes/
git commit -m "feat: create validation pipes for join-room, send-message, typing events"
```

---

## Task 6: Create Logging Interceptor

**Files:**
- Create: `src/interceptors/logging.interceptor.ts`

**Step 1: Create WebSocket logging interceptor**

Create `src/interceptors/logging.interceptor.ts`:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      const data = context.switchToWs().getData();
      const eventName = context.getHandler().name;

      const startTime = Date.now();
      console.log(`[WebSocket Event] ${eventName} - Client: ${client.id}`);

      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - startTime;
          console.log(`[WebSocket Event] ${eventName} completed in ${duration}ms`);
        }),
      );
    }

    return next.handle();
  }
}
```

**Step 2: Verify interceptor compiles**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/interceptors/logging.interceptor.ts
git commit -m "feat: create logging interceptor for WebSocket events"
```

---

## Task 7: Create WebSocket Exception Filter

**Files:**
- Create: `src/filters/ws-exception.filter.ts`

**Step 1: Create WebSocket exception filter**

Create `src/filters/ws-exception.filter.ts`:

```typescript
import { Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    const data = host.switchToWs().getData();

    let errorMessage = 'Internal server error';
    let errorCode = 'error:server';

    if (exception instanceof BadRequestException) {
      errorCode = 'error:validation';
      errorMessage = exception.getResponse()['message'] || exception.message;
    } else if (exception instanceof WsException) {
      errorCode = 'error:business';
      errorMessage = exception.getError() as string;
    } else if (exception.message) {
      errorMessage = exception.message;
    }

    console.error(`[WebSocket Error] ${errorCode}: ${errorMessage}`, exception.stack);

    client.emit('error', {
      code: errorCode,
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Step 2: Verify filter compiles**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/filters/ws-exception.filter.ts
git commit -m "feat: create WebSocket exception filter for error handling"
```

---

## Task 8: Create ChatGateway

**Files:**
- Create: `src/gateways/chat.gateway.ts`
- Create: `src/gateways/chat.gateway.spec.ts`

**Step 1: Write failing test for ChatGateway**

Create `src/gateways/chat.gateway.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../services/chat.service';
import { RoomService } from '../services/room.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockChatService;
  let mockRoomService;
  let mockServer;
  let mockSocket;

  beforeEach(async () => {
    mockChatService = {
      saveMessage: jest.fn(),
      getUsersInRoom: jest.fn(),
      addUserToRoom: jest.fn(),
      removeUserFromRoom: jest.fn(),
      markUserTyping: jest.fn(),
      removeUserTyping: jest.fn(),
    };

    mockRoomService = {
      getAllRooms: jest.fn(),
      getRoomById: jest.fn(),
    };

    mockSocket = {
      id: 'socket-1',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      data: {},
    };

    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: RoomService, useValue: mockRoomService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/gateways/chat.gateway.spec.ts`
Expected: FAIL - "ChatGateway is not defined"

**Step 3: Implement ChatGateway**

Create `src/gateways/chat.gateway.ts`:

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseFilters, UseInterceptors, UsePipes } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import { RoomService } from '../services/room.service';
import { WsExceptionFilter } from '../filters/ws-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { JoinRoomPipe, SendMessagePipe, TypingPipe } from '../pipes/index';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseFilters(WsExceptionFilter)
@UseInterceptors(LoggingInterceptor)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private roomService: RoomService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const rooms = await this.roomService.getAllRooms();
    client.emit('rooms:list', rooms);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  @UsePipes(JoinRoomPipe)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    // Validate room exists
    const room = await this.roomService.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Add user to room
    await this.chatService.addUserToRoom(roomId, userId);
    client.join(`room-${roomId}`);

    // Notify room members
    this.server.to(`room-${roomId}`).emit('user:joined', {
      userId,
      timestamp: new Date().toISOString(),
    });

    // Send updated user list
    const users = await this.chatService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', users);
  }

  @SubscribeMessage('message:send')
  @UsePipes(SendMessagePipe)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: string; text: string },
  ) {
    const { roomId, userId, text } = data;

    // Save message to database
    const message = await this.chatService.saveMessage(roomId, userId, text);

    // Broadcast to room members
    this.server.to(`room-${roomId}`).emit('message:new', {
      id: message.id,
      roomId,
      userId,
      text,
      createdAt: message.createdAt,
    });
  }

  @SubscribeMessage('typing:start')
  @UsePipes(TypingPipe)
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    // Mark user as typing (in-memory, no broadcast yet)
    await this.chatService.markUserTyping(roomId, userId);

    // Notify others in room that user is typing
    client.to(`room-${roomId}`).emit('user:typing', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing:stop')
  @UsePipes(TypingPipe)
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    // Remove user from typing status
    await this.chatService.removeUserTyping(roomId, userId);

    // Notify others in room
    client.to(`room-${roomId}`).emit('user:typing-stopped', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: string },
  ) {
    const { roomId, userId } = data;

    // Remove user from room
    await this.chatService.removeUserFromRoom(roomId, userId);
    client.leave(`room-${roomId}`);

    // Notify room members
    this.server.to(`room-${roomId}`).emit('user:left', {
      userId,
      timestamp: new Date().toISOString(),
    });

    // Send updated user list
    const users = await this.chatService.getUsersInRoom(roomId);
    this.server.to(`room-${roomId}`).emit('users:list', users);
  }
}
```

**Step 4: Create pipes index for easier imports**

Create `src/pipes/index.ts`:

```typescript
export { JoinRoomPipe } from './join-room.pipe';
export { SendMessagePipe } from './send-message.pipe';
export { TypingPipe } from './typing.pipe';
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- src/gateways/chat.gateway.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/gateways/ src/pipes/index.ts
git commit -m "feat: implement ChatGateway with room join/leave, messaging, typing indicators"
```

---

## Task 9: Setup AppModule and Database Initialization

**Files:**
- Modify: `src/app.module.ts`
- Create: `src/app.controller.ts` (basic health check)

**Step 1: Update AppModule to register TypeORM and services**

Replace `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { Room } from './entities/room.entity';
import { RoomUser } from './entities/room-user.entity';
import { Message } from './entities/message.entity';
import { TypingStatus } from './entities/typing-status.entity';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { RoomService } from './services/room.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Room, RoomUser, Message, TypingStatus]),
  ],
  controllers: [AppController],
  providers: [ChatGateway, ChatService, RoomService],
})
export class AppModule {}
```

**Step 2: Create basic HTTP health check controller**

Create `src/app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

**Step 3: Create database seed file (for initial rooms)**

Create `src/seed.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RoomService } from './services/room.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const roomService = app.get(RoomService);

  try {
    // Check if rooms already exist
    const existingRooms = await roomService.getAllRooms();
    
    if (existingRooms.length === 0) {
      console.log('Seeding initial rooms...');
      await roomService.createRoom('general');
      await roomService.createRoom('random');
      await roomService.createRoom('dev');
      console.log('Seed complete!');
    } else {
      console.log('Rooms already exist, skipping seed');
    }
  } catch (error) {
    console.error('Seed failed:', error);
  }

  await app.close();
}

seed();
```

**Step 4: Add seed script to package.json**

Update `package.json` scripts section to add:

```json
"seed": "ts-node src/seed.ts"
```

**Step 5: Verify module loads and database initializes**

Run: `npm run seed`
Expected: "Seed complete!" message, chat.db exists with rooms table populated

Then run: `npm run start:dev`
Expected: Server starts, health check available at http://localhost:3000/health

**Step 6: Commit**

```bash
git add src/app.module.ts src/app.controller.ts src/seed.ts package.json
git commit -m "feat: setup AppModule with TypeORM, initialize database with seed rooms"
```

---

## Task 10: Create Docker Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY src ./src
COPY tsconfig*.json nest-cli.json ./

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Run application
CMD ["npm", "run", "start:prod"]
```

**Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  chat-backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_PATH: /app/data/chat.db
    volumes:
      - chat-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  chat-data:
```

**Step 3: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
npm-debug.log
coverage
dist
.git
.gitignore
README.md
.env.local
chat.db
```

**Step 4: Test Docker build**

Run: `docker-compose build`
Expected: Build completes successfully

**Step 5: Test Docker run**

Run: `docker-compose up`
Expected: Container starts, service is healthy, logs show "Application is running on"

Press Ctrl+C to stop

**Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Docker configuration for development"
```

---

## Task 11: Create E2E Tests for WebSocket Flows

**Files:**
- Create: `test/chat.e2e-spec.ts`

**Step 1: Create E2E test file**

Create `test/chat.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../src/database.config';
import { Room } from '../src/entities/room.entity';
import { RoomUser } from '../src/entities/room-user.entity';
import { Message } from '../src/entities/message.entity';
import { TypingStatus } from '../src/entities/typing-status.entity';
import { ChatGateway } from '../src/gateways/chat.gateway';
import { ChatService } from '../src/services/chat.service';
import { RoomService } from '../src/services/room.service';
import { AppModule } from '../src/app.module';
import * as io from 'socket.io-client';

describe('Chat E2E Tests', () => {
  let app: INestApplication;
  let roomService: RoomService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001);
    roomService = moduleFixture.get<RoomService>(RoomService);

    // Create test room
    await roomService.createRoom('test-room');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect and receive room list', (done) => {
    const client = io('http://localhost:3001');

    client.on('rooms:list', (rooms) => {
      expect(rooms).toBeDefined();
      expect(Array.isArray(rooms)).toBe(true);
      client.disconnect();
      done();
    });
  });

  it('should join a room and broadcast user joined', (done) => {
    const client1 = io('http://localhost:3001');
    const client2 = io('http://localhost:3001');

    let client2Connected = false;

    client2.on('connect', () => {
      client2Connected = true;
      if (client2Connected) {
        client1.emit('room:join', { roomId: 1, userId: 'user1' });
      }
    });

    client1.on('connect', () => {
      client1.emit('room:join', { roomId: 1, userId: 'user1' });
    });

    client2.on('user:joined', (data) => {
      expect(data.userId).toBe('user1');
      client1.disconnect();
      client2.disconnect();
      done();
    });
  });

  it('should send message and broadcast to room', (done) => {
    const client = io('http://localhost:3001');

    client.on('connect', () => {
      client.emit('room:join', { roomId: 1, userId: 'user1' });

      client.on('users:list', () => {
        client.emit('message:send', {
          roomId: 1,
          userId: 'user1',
          text: 'Hello World',
        });
      });

      client.on('message:new', (message) => {
        expect(message.text).toBe('Hello World');
        expect(message.userId).toBe('user1');
        client.disconnect();
        done();
      });
    });
  });

  it('should validate message length', (done) => {
    const client = io('http://localhost:3001');

    client.on('connect', () => {
      client.emit('room:join', { roomId: 1, userId: 'user1' });

      client.on('users:list', () => {
        client.emit('message:send', {
          roomId: 1,
          userId: 'user1',
          text: 'x'.repeat(501), // Too long
        });
      });

      client.on('error', (error) => {
        expect(error.code).toBe('error:validation');
        client.disconnect();
        done();
      });
    });
  });

  it('should handle typing indicators', (done) => {
    const client1 = io('http://localhost:3001');
    const client2 = io('http://localhost:3001');

    let bothConnected = false;

    const checkBothConnected = () => {
      if (client1.connected && client2.connected && !bothConnected) {
        bothConnected = true;
        client1.emit('room:join', { roomId: 1, userId: 'user1' });
        client2.emit('room:join', { roomId: 1, userId: 'user2' });
      }
    };

    client1.on('connect', checkBothConnected);
    client2.on('connect', checkBothConnected);

    client2.on('user:typing', (data) => {
      expect(data.userId).toBe('user1');
      client1.disconnect();
      client2.disconnect();
      done();
    });

    let roomsReceived = 0;
    client1.on('users:list', () => {
      roomsReceived++;
      if (roomsReceived === 1) {
        client1.emit('typing:start', { roomId: 1, userId: 'user1' });
      }
    });
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e`
Expected: All tests pass

**Step 3: Commit**

```bash
git add test/chat.e2e-spec.ts
git commit -m "test: add E2E tests for WebSocket flows (join, message, typing)"
```

---

## Task 12: Documentation and README

**Files:**
- Create: `README.md`
- Modify: `.env.example` (for environment setup)

**Step 1: Create .env.example**

Create `.env.example`:

```
DATABASE_PATH=chat.db
NODE_ENV=development
PORT=3000
```

**Step 2: Create comprehensive README**

Create `README.md`:

```markdown
# WebSocket Chat Prototype

A real-time chat backend built with NestJS, Socket.io, Fastify, and SQLite. Learning prototype for WebSocket fundamentals.

## Features

- Real-time messaging in chat rooms
- User presence tracking (who's in the room)
- Typing indicators (see who's typing)
- Message persistence with SQLite
- WebSocket exception handling and validation
- Event logging and interceptors
- Docker support

## Tech Stack

- **Framework:** NestJS 11 with Fastify adapter
- **WebSockets:** Socket.io
- **Database:** SQLite with TypeORM
- **Validation:** NestJS Pipes
- **Middleware:** Interceptors, Exception Filters
- **Testing:** Jest, Supertest
- **Container:** Docker

## Learning Concepts Covered

1. **Gateways** — WebSocket entry point and event handlers
2. **Pipes** — Input validation for WebSocket events
3. **Interceptors** — Cross-cutting concerns (logging, metrics)
4. **Exception Filters** — Structured error handling
5. **Socket.io Adapters** — Room-based broadcasting
6. **Services** — Business logic separation
7. **Entity Relationships** — Database modeling with TypeORM

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Docker (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Seed initial rooms
npm run seed

# Start development server
npm run start:dev
```

The server will start on `http://localhost:3000`.

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up

# The service will be available on http://localhost:3000
```

## API Documentation

### WebSocket Events

#### Server → Client

- `rooms:list` — Returns list of all available chat rooms
- `user:joined` — Notifies room when user joins
- `user:left` — Notifies room when user leaves
- `users:list` — Current list of users in a room
- `message:new` — New message in room
- `user:typing` — User is typing in room
- `user:typing-stopped` — User stopped typing
- `error` — Error event with structured error data

#### Client → Server

- `room:join` — Join a chat room
  ```json
  { "roomId": 1, "userId": "user1" }
  ```
- `room:leave` — Leave a chat room
  ```json
  { "roomId": 1, "userId": "user1" }
  ```
- `message:send` — Send a message to room
  ```json
  { "roomId": 1, "userId": "user1", "text": "Hello" }
  ```
- `typing:start` — Notify room user is typing
  ```json
  { "roomId": 1, "userId": "user1" }
  ```
- `typing:stop` — Notify room user stopped typing
  ```json
  { "roomId": 1, "userId": "user1" }
  ```

## Database Schema

```sql
-- Chat rooms
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP
);

-- User presence in rooms
CREATE TABLE room_users (
  id INTEGER PRIMARY KEY,
  room_id INTEGER,
  user_id TEXT,
  joined_at TIMESTAMP
);

-- Message history
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  room_id INTEGER,
  user_id TEXT,
  text TEXT,
  created_at TIMESTAMP
);

-- Ephemeral typing status
CREATE TABLE typing_status (
  id INTEGER PRIMARY KEY,
  room_id INTEGER,
  user_id TEXT,
  expires_at TIMESTAMP
);
```

## Project Structure

```
src/
├── entities/          # Database entities (Room, Message, etc.)
├── services/          # Business logic (ChatService, RoomService)
├── gateways/          # WebSocket gateway
├── pipes/             # Input validation
├── filters/           # Exception handling
├── interceptors/      # Logging and cross-cutting concerns
├── app.module.ts      # Main module
├── app.controller.ts  # HTTP health check
├── main.ts            # Entry point
└── seed.ts            # Database seeding
```

## Next Steps (Out of Scope)

- Authentication with guards
- Message history pagination
- Rate limiting
- Redis adapter for scaling across servers
- Angular frontend
- WebSocket reconnection logic
- Message reactions/emojis
- Direct messaging between users

## Notes

- Messages are stored indefinitely; implement archival strategy for production
- Typing status auto-expires after 5 seconds
- No authentication required for this prototype (guards are out of scope)
- SQLite is suitable for development; use PostgreSQL for production

## License

UNLICENSED
```

**Step 3: Verify documentation is complete**

Run: `npm run build && npm run start:dev`
Expected: App starts successfully

**Step 4: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add comprehensive README and environment setup guide"
```

---

## Summary

The implementation is now complete with:

✅ Fastify adapter configured  
✅ SQLite database with TypeORM  
✅ Room, RoomUser, Message, TypingStatus entities  
✅ RoomService for room management  
✅ ChatService for messaging and presence  
✅ ChatGateway with 6 core WebSocket events  
✅ Validation pipes for all events  
✅ Logging interceptor  
✅ Exception filter for error handling  
✅ Database seeding  
✅ Docker configuration  
✅ E2E tests  
✅ Comprehensive documentation  

**Total commits:** 12

---

## Testing the Prototype

Once all tasks are complete:

1. Start the server: `npm run start:dev`
2. Connect with Socket.io client (browser, CLI tool, or manual testing)
3. Join a room: `emit('room:join', { roomId: 1, userId: 'alice' })`
4. Send message: `emit('message:send', { roomId: 1, userId: 'alice', text: 'Hello' })`
5. See typing indicator: `emit('typing:start', { roomId: 1, userId: 'alice' })`

All WebSocket concepts (gateways, pipes, interceptors, filters, adapters) are now exercised through real functionality.
