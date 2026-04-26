import { Injectable, PipeTransform } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class SendMessagePipe implements PipeTransform {
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
    if (typeof payload.text !== 'string' || payload.text.length === 0) {
      throw new WsException('message must be a non-empty string');
    }
    if (payload.text.length > 500) {
      throw new WsException('message must be less than 500 characters');
    }
    return value;
  }
}
