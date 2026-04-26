export interface Message {
  id: number;
  content: string;
  createdAt: string;
  sender: string;
  roomId: number;
}

export interface Room {
  id: number;
  name: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  messageId: number;
}

export const SocketEvents = {
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
  SEND_MESSAGE: 'message:send',
  RECEIVE_MESSAGE: 'message:receive',
  REACTION_TOGGLE: 'reaction:toggle',
  REACTIONS_SNAPSHOT: 'reactions:snapshot',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
