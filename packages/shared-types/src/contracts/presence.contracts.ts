import type { RoomUser } from '../entities';

export interface JoinRoomRequest {
  roomId: number;
  userId: string;
}

export type LeaveRoomRequest = JoinRoomRequest;

export interface UserJoinedEvent {
  userId: string;
  timestamp: string;
}

export type UserLeftEvent = UserJoinedEvent;

export type UsersListEvent = RoomUser[];

export interface TypingRequest {
  roomId: number;
  userId: string;
}

export interface UserTypingEvent {
  userId: string;
  timestamp: string;
}

export type UserTypingStoppedEvent = UserTypingEvent;
