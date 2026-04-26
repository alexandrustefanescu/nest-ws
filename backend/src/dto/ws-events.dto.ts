import { ApiProperty } from '@nestjs/swagger';

// ─── Incoming event payloads (client → server) ───────────────────────────────

export class JoinRoomDto {
  @ApiProperty({ example: 1, description: 'ID of the room to join' })
  roomId: number;

  @ApiProperty({ example: 'user-123', description: 'Unique identifier for the user' })
  userId: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 1 })
  roomId: number;

  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ example: 'Hello, world!' })
  text: string;
}

export class TypingDto {
  @ApiProperty({ example: 1 })
  roomId: number;

  @ApiProperty({ example: 'user-123' })
  userId: string;
}

// ─── Outgoing event payloads (server → client) ───────────────────────────────

export class RoomDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'general' })
  name: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class RoomsListEventDto {
  @ApiProperty({ type: [RoomDto], description: 'Emitted as: rooms:list — sent to the connecting client' })
  rooms: RoomDto[];
}

export class UserJoinedEventDto {
  @ApiProperty({ example: 'user-123', description: 'Emitted as: user:joined — broadcast to the room' })
  userId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

export class RoomUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  roomId: number;

  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  joinedAt: string;
}

export class UsersListEventDto {
  @ApiProperty({ type: [RoomUserDto], description: 'Emitted as: users:list — broadcast to the room' })
  users: RoomUserDto[];
}

export class MessageNewEventDto {
  @ApiProperty({ example: 42, description: 'Emitted as: message:new — broadcast to the room' })
  id: number;

  @ApiProperty({ example: 1 })
  roomId: number;

  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ example: 'Hello, world!' })
  text: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class UserTypingEventDto {
  @ApiProperty({ example: 'user-123', description: 'Emitted as: user:typing — broadcast to other room members' })
  userId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

export class UserLeftEventDto {
  @ApiProperty({ example: 'user-123', description: 'Emitted as: user:left — broadcast to the room' })
  userId: string;
}

export class WsInfoResponseDto {
  @ApiProperty({ example: 'WebSocket event documentation. Connect via Socket.IO at ws://localhost:3000' })
  message: string;
}
