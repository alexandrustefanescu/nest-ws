import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { env } from '../../config/env';

@WebSocketGateway({
  cors: { origin: env.corsOrigin, credentials: true },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;
}
