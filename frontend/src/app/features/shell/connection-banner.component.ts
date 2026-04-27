import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ConnectionState } from '../../core/chat/chat-socket.service';

@Component({
  selector: 'app-connection-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .toast-wrap {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
      animation: toast-in 200ms var(--ease-out, cubic-bezier(.2,.8,.2,1)) both;
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .toast-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 16px;
      background: var(--surface-1, #fff);
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-strong, #111);
      white-space: nowrap;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.connecting {
      background: oklch(75% 0.15 85);
    }

    .status-dot.disconnected {
      background: var(--danger, oklch(56% 0.2 25));
    }
  `],
  template: `
    @if (state() !== 'connected') {
      <div class="toast-wrap" role="status" aria-live="polite">
        <div class="toast-pill">
          <span
            class="status-dot"
            [class.connecting]="state() === 'connecting'"
            [class.disconnected]="state() === 'disconnected'"
            aria-hidden="true"
          ></span>
          @if (state() === 'connecting') {
            Connecting to server…
          } @else {
            Disconnected — trying to reconnect
          }
        </div>
      </div>
    }
  `,
})
export class ConnectionBannerComponent {
  readonly state = input.required<ConnectionState>();
}
