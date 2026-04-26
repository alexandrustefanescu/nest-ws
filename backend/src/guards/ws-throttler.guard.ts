import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';

export const WS_THROTTLE_KEY = 'ws_throttle';

export interface WsThrottleOptions {
  limit: number;
  ttl: number;
}

export const WsThrottle = (limit: number, ttl: number): MethodDecorator =>
  Reflect.metadata(WS_THROTTLE_KEY, { limit, ttl });

interface BucketEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class WsThrottlerGuard implements CanActivate {
  private readonly buckets = new Map<string, Map<string, BucketEntry>>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const opts = this.reflector.get<WsThrottleOptions>(WS_THROTTLE_KEY, context.getHandler());
    if (!opts) return true;

    const client: Socket = context.switchToWs().getClient();
    const eventKey = context.getHandler().name;
    const socketId = client.id;
    const now = Date.now();

    let socketBuckets = this.buckets.get(socketId);
    if (!socketBuckets) {
      socketBuckets = new Map();
      this.buckets.set(socketId, socketBuckets);
    }

    let bucket = socketBuckets.get(eventKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + opts.ttl };
      socketBuckets.set(eventKey, bucket);
    }

    bucket.count++;
    if (bucket.count > opts.limit) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  evict(socketId: string): void {
    this.buckets.delete(socketId);
  }
}
