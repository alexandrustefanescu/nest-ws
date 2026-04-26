import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../services/chat.service';
import { RoomService } from '../services/room.service';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const mockTo = { emit: jest.fn() };

const mockServer = {
  to: jest.fn().mockReturnValue(mockTo),
  emit: jest.fn(),
} as unknown as Server;

const mockSocket = {
  id: 'socket-1',
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  data: {},
} as unknown as Socket;

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockChatService: {
    saveMessage: jest.Mock;
    getUsersInRoom: jest.Mock;
    addUserToRoom: jest.Mock;
    removeUserFromRoom: jest.Mock;
    markUserTyping: jest.Mock;
    removeUserTyping: jest.Mock;
    clearRoomData: jest.Mock;
  };
  let mockRoomService: {
    getAllRooms: jest.Mock;
    getRoomById: jest.Mock;
    deleteRoom: jest.Mock;
  };

  beforeEach(async () => {
    mockChatService = {
      saveMessage: jest.fn(),
      getUsersInRoom: jest.fn().mockResolvedValue([]),
      addUserToRoom: jest.fn(),
      removeUserFromRoom: jest.fn(),
      markUserTyping: jest.fn(),
      removeUserTyping: jest.fn(),
      clearRoomData: jest.fn(),
    };

    mockRoomService = {
      getAllRooms: jest.fn().mockResolvedValue([]),
      getRoomById: jest.fn(),
      deleteRoom: jest.fn(),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: RoomService, useValue: mockRoomService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should emit rooms list on connection', async () => {
    const rooms = [{ id: 1, name: 'general', createdAt: new Date() }];
    mockRoomService.getAllRooms.mockResolvedValue(rooms);

    await gateway.handleConnection(mockSocket);

    expect(mockSocket.emit).toHaveBeenCalledWith('rooms:list', rooms);
  });

  it('should throw WsException when joining non-existent room', async () => {
    mockRoomService.getRoomById.mockResolvedValue(null);

    await expect(
      gateway.handleJoinRoom(mockSocket, { roomId: 99, userId: 'user1' }),
    ).rejects.toThrow(WsException);
  });

  it('should add user to room and broadcast on join', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockChatService.addUserToRoom.mockResolvedValue({ id: 1, roomId: 1, userId: 'user1' });
    mockChatService.getUsersInRoom.mockResolvedValue([{ userId: 'user1' }]);

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockSocket.join).toHaveBeenCalledWith('room-1');
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
  });

  it('should save message and broadcast on send', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    const message = { id: 1, roomId: 1, userId: 'user1', text: 'Hello', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockChatService.saveMessage.mockResolvedValue(message);

    await gateway.handleSendMessage(mockSocket, { roomId: 1, userId: 'user1', text: 'Hello' });

    expect(mockChatService.saveMessage).toHaveBeenCalledWith(1, 'user1', 'Hello');
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
  });

  it('should mark typing and notify others', async () => {
    mockChatService.markUserTyping.mockResolvedValue({});

    await gateway.handleTypingStart(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockChatService.markUserTyping).toHaveBeenCalledWith(1, 'user1');
    expect(mockSocket.to).toHaveBeenCalledWith('room-1');
  });

  it('should remove typing status on typing stop', async () => {
    mockChatService.removeUserTyping.mockResolvedValue(undefined);

    await gateway.handleTypingStop(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockChatService.removeUserTyping).toHaveBeenCalledWith(1, 'user1');
  });

  it('should remove user from room on leave', async () => {
    mockChatService.removeUserFromRoom.mockResolvedValue(undefined);
    mockChatService.getUsersInRoom.mockResolvedValue([]);

    await gateway.handleLeaveRoom(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockSocket.leave).toHaveBeenCalledWith('room-1');
    expect(mockChatService.removeUserFromRoom).toHaveBeenCalledWith(1, 'user1');
  });

  it('should throw WsException when deleting non-existent room', async () => {
    mockRoomService.getRoomById.mockResolvedValue(null);

    await expect(
      gateway.handleDeleteRoom(mockSocket, { roomId: 99 }),
    ).rejects.toThrow(WsException);
  });

  it('should delete room, clear data and broadcast rooms list', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockChatService.clearRoomData.mockResolvedValue(undefined);
    mockRoomService.deleteRoom.mockResolvedValue(undefined);
    mockRoomService.getAllRooms.mockResolvedValue([]);

    await gateway.handleDeleteRoom(mockSocket, { roomId: 1 });

    expect(mockChatService.clearRoomData).toHaveBeenCalledWith(1);
    expect(mockRoomService.deleteRoom).toHaveBeenCalledWith(1);
    expect(mockServer.emit).toHaveBeenCalledWith('rooms:list', []);
  });
});
