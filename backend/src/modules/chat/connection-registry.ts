type ClientRooms = Map<number, string>;
type RoomUserSockets = Map<string, Set<string>>;

export class ConnectionRegistry {
  private readonly clientRooms = new Map<string, ClientRooms>();
  private readonly roomUserSockets = new Map<number, RoomUserSockets>();

  track(clientId: string, roomId: number, userId: string): boolean {
    const clientRooms = this.getOrCreateClientRooms(clientId);
    const previousUserId = clientRooms.get(roomId);

    if (previousUserId === userId) {
      return false;
    }
    if (previousUserId) {
      this.removeSocketFromRoom(clientId, roomId, previousUserId);
    }

    clientRooms.set(roomId, userId);
    const userSockets = this.getOrCreateUserSockets(roomId, userId);
    const wasOffline = userSockets.size === 0;
    userSockets.add(clientId);
    return wasOffline;
  }

  untrack(clientId: string, roomId: number, userId: string): boolean {
    const clientRooms = this.clientRooms.get(clientId);
    if (clientRooms?.get(roomId) === userId) {
      clientRooms.delete(roomId);
      if (clientRooms.size === 0) {
        this.clientRooms.delete(clientId);
      }
    }

    const userStillPresent = this.removeSocketFromRoom(clientId, roomId, userId);
    return !userStillPresent;
  }

  roomsForClient(clientId: string): IterableIterator<[number, string]> {
    return (this.clientRooms.get(clientId) ?? new Map()).entries();
  }

  evict(clientId: string): void {
    this.clientRooms.delete(clientId);
    for (const [, roomUsers] of this.roomUserSockets) {
      for (const [, sockets] of roomUsers) {
        sockets.delete(clientId);
      }
    }
  }

  private removeSocketFromRoom(clientId: string, roomId: number, userId: string): boolean {
    const roomUsers = this.roomUserSockets.get(roomId);
    const userSockets = roomUsers?.get(userId);
    if (!roomUsers || !userSockets) return false;

    userSockets.delete(clientId);
    if (userSockets.size > 0) return true;

    roomUsers.delete(userId);
    if (roomUsers.size === 0) this.roomUserSockets.delete(roomId);
    return false;
  }

  private getOrCreateClientRooms(clientId: string): ClientRooms {
    let rooms = this.clientRooms.get(clientId);
    if (!rooms) {
      rooms = new Map();
      this.clientRooms.set(clientId, rooms);
    }
    return rooms;
  }

  private getOrCreateUserSockets(roomId: number, userId: string): Set<string> {
    let roomUsers = this.roomUserSockets.get(roomId);
    if (!roomUsers) {
      roomUsers = new Map();
      this.roomUserSockets.set(roomId, roomUsers);
    }
    let sockets = roomUsers.get(userId);
    if (!sockets) {
      sockets = new Set();
      roomUsers.set(userId, sockets);
    }
    return sockets;
  }
}
