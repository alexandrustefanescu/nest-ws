import { WsException } from '@nestjs/websockets';

export const POST_MAX_LENGTH = 500;

export function normalizePostText(text: string): string {
  const normalized = text.trim();
  if (normalized.length === 0) {
    throw new WsException('Post text is required');
  }
  if ([...normalized].length > POST_MAX_LENGTH) {
    throw new WsException(`Post text must be shorter than or equal to ${POST_MAX_LENGTH} characters`);
  }
  return normalized;
}
