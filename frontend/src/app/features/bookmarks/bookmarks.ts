import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Identity } from '../../core/identity/identity';
import { BookmarkService } from '../../core/social/bookmark.service';
import { PostCard } from '../home/post-card';

@Component({
  selector: 'app-bookmarks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 min-h-0' },
  imports: [MatIconModule, MatProgressSpinnerModule, PostCard],
  templateUrl: './bookmarks.html',
  styleUrl: './bookmarks.css',
})
export class Bookmarks implements OnInit {
  readonly bookmarks = inject(BookmarkService);
  readonly identity = inject(Identity);

  readonly suggestedUsers = ['alice', 'bob', 'charlie', 'diana'];

  ngOnInit(): void {
    this.bookmarks.loadBookmarks();
  }

  userHue(userId: string): number {
    let h = 5381;
    for (let i = 0; i < userId.length; i++) h = (h * 33) ^ userId.charCodeAt(i);
    return Math.abs(h) % 360;
  }
}
