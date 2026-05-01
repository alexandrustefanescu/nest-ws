import { BadRequestException } from '@nestjs/common';

export const POST_COMMENT_BODY_MAX_LENGTH = 1000;

export function normalizePostTitle(title: string): string {
  const normalized = title.trim();
  if (normalized.length === 0) {
    throw new BadRequestException('Post title is required');
  }
  return normalized;
}

export function normalizePostBody(body: string): string {
  const normalized = body.trim();
  if (normalized.length === 0) {
    throw new BadRequestException('Post body is required');
  }
  return normalized;
}

export function normalizeCommentBody(body: string): string {
  const normalized = body.trim();
  if (normalized.length === 0) {
    throw new BadRequestException('Comment body is required');
  }
  if ([...normalized].length > POST_COMMENT_BODY_MAX_LENGTH) {
    throw new BadRequestException(
      `Comment body must be shorter than or equal to ${POST_COMMENT_BODY_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}
