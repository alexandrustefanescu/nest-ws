import { WsException } from '@nestjs/websockets';
import { normalizePostText, POST_MAX_LENGTH } from './post-content.policy';

describe('post content policy', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizePostText('  hello 🔥  ')).toBe('hello 🔥');
  });

  it('rejects empty post text', () => {
    expect(() => normalizePostText('')).toThrow(WsException);
    expect(() => normalizePostText('   ')).toThrow('Post text is required');
  });

  it('rejects text longer than the post limit', () => {
    expect(() => normalizePostText('x'.repeat(POST_MAX_LENGTH + 1))).toThrow(
      `Post text must be shorter than or equal to ${POST_MAX_LENGTH} characters`,
    );
  });

  it('accepts emoji-only post text', () => {
    expect(normalizePostText('🔥😂❤️')).toBe('🔥😂❤️');
  });

  it('accepts text mixed with emoji', () => {
    expect(normalizePostText('hello 🔥')).toBe('hello 🔥');
  });
});
