import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 items-center justify-center' },
  imports: [RouterLink, MatIconModule],
  styleUrl: './empty-room.css',
  templateUrl: './empty-room.html',
})
export class EmptyRoom {}
