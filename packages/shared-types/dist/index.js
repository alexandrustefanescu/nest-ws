"use strict";
// ─── Wire-format interfaces (shapes that cross the socket) ───────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvents = void 0;
// ─── Socket event names ───────────────────────────────────────────────────────
exports.SocketEvents = {
    // Client → server
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
    ROOM_CREATE: 'room:create',
    ROOM_DELETE: 'room:delete',
    SEND_MESSAGE: 'message:send',
    REACTION_TOGGLE: 'reaction:toggle',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    // Server → client
    ROOMS_LIST: 'rooms:list',
    USERS_LIST: 'users:list',
    MESSAGE_NEW: 'message:new',
    USER_JOINED: 'user:joined',
    USER_LEFT: 'user:left',
    USER_TYPING: 'user:typing',
    USER_TYPING_STOPPED: 'user:typing-stopped',
    REACTIONS_SNAPSHOT: 'reactions:snapshot',
    REACTION_UPDATED: 'reaction:updated',
};
