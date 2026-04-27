export const SocketEvents = {
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
  MESSAGES_HISTORY: 'messages:history',
  MESSAGES_LOAD_MORE: 'messages:load-more',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_DELETED: 'message:deleted',
  CHAT_CLEAR: 'chat:clear',
  CHAT_CLEARED: 'chat:cleared',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
