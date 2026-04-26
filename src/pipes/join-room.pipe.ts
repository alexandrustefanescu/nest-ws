import { Injectable, PipeTransform } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class JoinRoomPipe implements PipeTransform {
  transform(value: unknown) {
    if (!value || typeof value !== 'object') {
      throw new WsException('Invalid payload');
    }
    const payload = value as Record<string, unknown>;
    if (!payload.roomId) {
      throw new WsException('roomId is required');
    }
    if (!payload.userId) {
      throw new WsException('userId is required');
    }
    return value;
  }
}
