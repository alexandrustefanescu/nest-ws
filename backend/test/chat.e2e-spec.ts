import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { RoomsService } from '../src/modules/rooms/rooms.service';

const TEST_PORT = 3099;
const TIMEOUT = 10000;

function connect(): Socket {
  return io(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
}

function waitFor<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function connected(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    if (socket.connected) resolve();
    else socket.once('connect', resolve);
  });
}

describe('Chat E2E', () => {
  let app: INestApplication;
  let roomService: RoomsService;
  let testRoomId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.listen(TEST_PORT, '0.0.0.0');

    roomService = moduleFixture.get<RoomsService>(RoomsService);
    const room = await roomService.createRoom(`e2e-${Date.now()}`);
    testRoomId = room.id;
  }, TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  it('should receive rooms list on connect', async () => {
    const client = connect();
    const rooms = await waitFor<unknown[]>(client, 'rooms:list');
    expect(Array.isArray(rooms)).toBe(true);
    client.disconnect();
  }, TIMEOUT);

  it('should join a room and receive user:joined broadcast', async () => {
    const client1 = connect();
    const client2 = connect();

    // Wait for both to connect and receive initial rooms list
    await Promise.all([
      waitFor(client1, 'rooms:list'),
      waitFor(client2, 'rooms:list'),
    ]);

    // client2 joins first so it receives client1's user:joined event
    client2.emit('room:join', { roomId: testRoomId, userId: 'bob' });
    await waitFor(client2, 'users:list');

    // Now client1 joins — client2 should receive the broadcast
    const joinedPromise = waitFor<{ userId: string }>(client2, 'user:joined');
    client1.emit('room:join', { roomId: testRoomId, userId: 'alice' });

    const joined = await joinedPromise;
    expect(joined.userId).toBe('alice');

    client1.disconnect();
    client2.disconnect();
  }, TIMEOUT);

  it('should send message and receive message:new broadcast', async () => {
    const client = connect();
    await waitFor(client, 'rooms:list');

    client.emit('room:join', { roomId: testRoomId, userId: 'alice' });
    await waitFor(client, 'users:list');

    const messagePromise = waitFor<{ text: string; userId: string }>(client, 'message:new');
    client.emit('message:send', { roomId: testRoomId, userId: 'alice', text: 'Hello E2E' });

    const message = await messagePromise;
    expect(message.text).toBe('Hello E2E');
    expect(message.userId).toBe('alice');
    client.disconnect();
  }, TIMEOUT);

  it('should reject message over 500 chars with error event', async () => {
    const client = connect();
    await waitFor(client, 'rooms:list');

    client.emit('room:join', { roomId: testRoomId, userId: 'alice' });
    await waitFor(client, 'users:list');

    const errorPromise = waitFor<{ status: string; message: string }>(client, 'error');
    client.emit('message:send', { roomId: testRoomId, userId: 'alice', text: 'x'.repeat(501) });

    const error = await errorPromise;
    expect(error.status).toBe('error');
    expect(error.message).toContain('500');
    client.disconnect();
  }, TIMEOUT);

  it('should emit user:typing to other clients in same room', async () => {
    const client1 = connect();
    const client2 = connect();

    await Promise.all([
      waitFor(client1, 'rooms:list'),
      waitFor(client2, 'rooms:list'),
    ]);

    // Both join the room
    client1.emit('room:join', { roomId: testRoomId, userId: 'alice' });
    client2.emit('room:join', { roomId: testRoomId, userId: 'bob' });

    await Promise.all([
      waitFor(client1, 'users:list'),
      waitFor(client2, 'users:list'),
    ]);

    // client2 listens for typing from client1
    const typingPromise = waitFor<{ userId: string }>(client2, 'user:typing');
    client1.emit('typing:start', { roomId: testRoomId, userId: 'alice' });

    const typing = await typingPromise;
    expect(typing.userId).toBe('alice');

    client1.disconnect();
    client2.disconnect();
  }, TIMEOUT);
});
