import { ConnectionRegistry } from './connection-registry';

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;

  beforeEach(() => {
    registry = new ConnectionRegistry();
  });

  it('track returns true when user becomes present in the room', () => {
    expect(registry.track('s1', 1, 'alice')).toBe(true);
  });

  it('track returns false when the same user reconnects with a second socket', () => {
    registry.track('s1', 1, 'alice');
    expect(registry.track('s2', 1, 'alice')).toBe(false);
  });

  it('untrack returns false while another socket keeps the user online', () => {
    registry.track('s1', 1, 'alice');
    registry.track('s2', 1, 'alice');
    expect(registry.untrack('s1', 1, 'alice')).toBe(false);
  });

  it('untrack returns true when the last socket leaves', () => {
    registry.track('s1', 1, 'alice');
    expect(registry.untrack('s1', 1, 'alice')).toBe(true);
  });

  it('roomsForClient returns each room the socket is in', () => {
    registry.track('s1', 1, 'alice');
    registry.track('s1', 2, 'alice');
    expect([...registry.roomsForClient('s1')]).toEqual([[1, 'alice'], [2, 'alice']]);
  });

  it('track returns true when a different user joins the same room on the same socket', () => {
    registry.track('s1', 1, 'alice');
    expect(registry.track('s1', 1, 'bob')).toBe(true);
  });

  it('evict removes all bookkeeping for a socket', () => {
    registry.track('s1', 1, 'alice');
    registry.evict('s1');
    expect([...registry.roomsForClient('s1')]).toEqual([]);
  });
});
