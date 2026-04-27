import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ConnectionState } from '../../core/chat/chat-socket.service';

@Component({
  selector: 'app-connection-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './connection-banner.css',
  templateUrl: './connection-banner.html',
})
export class ConnectionBanner {
  readonly state = input.required<ConnectionState>();
}
