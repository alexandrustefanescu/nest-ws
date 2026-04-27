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

/** { [emoji]: userId[] } */
export type ReactionMap = Record<string, string[]>;
