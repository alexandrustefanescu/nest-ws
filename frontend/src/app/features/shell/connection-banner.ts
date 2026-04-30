import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import type { ConnectionState } from '../../core/chat/chat-socket';

const SHOW_DELAY_MS = 800;

@Component({
  selector: 'app-connection-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatChipsModule, MatIconModule],
  templateUrl: './connection-banner.html',
})
export class ConnectionBanner {
  readonly state = input.required<ConnectionState>();
  readonly hasConnectedOnce = input.required<boolean>();

  protected readonly visible = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
    });

    effect(() => {
      const conn = this.state();
      const ever = this.hasConnectedOnce();

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }

      if (conn === 'connected' || !ever) {
        this.visible.set(false);
      } else {
        this.timer = setTimeout(() => {
          this.visible.set(true);
          this.timer = null;
        }, SHOW_DELAY_MS);
      }
    });
  }
}
