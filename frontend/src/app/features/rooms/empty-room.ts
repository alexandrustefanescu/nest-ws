import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 items-center justify-center' },
  imports: [RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './empty-room.html',
})
export class EmptyRoom {}
