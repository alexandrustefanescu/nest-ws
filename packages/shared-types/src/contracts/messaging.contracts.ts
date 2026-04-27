import type { Message, ReactionMap } from '../entities';

export interface SendMessageRequest {
  roomId: number;
  userId: string;
  text: string;
}

export interface MessageNewEvent {
  id: number;
  roomId: number;
  userId: string;
  text: string;
  createdAt: Date | string;
}

export interface DeleteMessageRequest {
  roomId: number;
  messageId: number;
  userId: string;
}

export interface MessageDeletedEvent {
  roomId: number;
  messageId: number;
}

export interface LoadMoreRequest {
  roomId: number;
  before: number;
}

export interface LoadMoreResponse {
  messages: Message[];
  hasMore: boolean;
}

export interface MessagesHistoryEvent {
  roomId: number;
  messages: Message[];
  hasMore: boolean;
}

export interface ToggleReactionRequest {
  roomId: number;
  messageId: number;
  userId: string;
  emoji: string;
}

export interface ReactionUpdatedEvent {
  messageId: number;
  reactions: ReactionMap;
}

export type ReactionsSnapshotEvent = Record<number, ReactionMap>;

export interface ClearChatRequest {
  roomId: number;
  userId: string;
}

export interface ChatClearedEvent {
  roomId: number;
}

export interface WsErrorEvent {
  status: 'error';
  message: string;
  timestamp: string;
}
