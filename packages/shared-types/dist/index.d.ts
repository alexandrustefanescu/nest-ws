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
export declare const SocketEvents: {
    readonly ROOM_JOIN: "room:join";
    readonly ROOM_LEAVE: "room:leave";
    readonly ROOM_CREATE: "room:create";
    readonly ROOM_DELETE: "room:delete";
    readonly SEND_MESSAGE: "message:send";
    readonly REACTION_TOGGLE: "reaction:toggle";
    readonly TYPING_START: "typing:start";
    readonly TYPING_STOP: "typing:stop";
    readonly ROOMS_LIST: "rooms:list";
    readonly USERS_LIST: "users:list";
    readonly MESSAGE_NEW: "message:new";
    readonly USER_JOINED: "user:joined";
    readonly USER_LEFT: "user:left";
    readonly USER_TYPING: "user:typing";
    readonly USER_TYPING_STOPPED: "user:typing-stopped";
    readonly REACTIONS_SNAPSHOT: "reactions:snapshot";
    readonly REACTION_UPDATED: "reaction:updated";
};
export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
//# sourceMappingURL=index.d.ts.map