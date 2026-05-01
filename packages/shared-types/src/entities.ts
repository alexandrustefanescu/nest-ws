export interface Room {
  id: number;
  name: string;
  createdAt: string;
}

export interface RoomUser {
  id: number;
  roomId: number;
  userId: string;
  joinedAt: string;
}

export interface Message {
  id: number;
  roomId: number;
  userId: string;
  text: string;
  createdAt: string;
}

export type Post = Message;

/** { [emoji]: userId[] } */
export type ReactionMap = Record<string, string[]>;

export type NotificationType = 'like' | 'comment';

export interface Notification {
  id: number;
  type: NotificationType;
  actorId: string;
  postId: number;
  postTitle: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationNewEvent {
  id: number;
  type: NotificationType;
  actorId: string;
  postId: number;
  postTitle: string;
  createdAt: string;
}
