import type { Room } from '../entities';

export interface CreateRoomRequest {
  name: string;
}

export interface DeleteRoomRequest {
  roomId: number;
}

export type RoomsListEvent = Room[];
