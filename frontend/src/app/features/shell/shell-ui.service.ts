import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  private readonly toggleSidenavSource = new Subject<void>();
  readonly toggleSidenav$ = this.toggleSidenavSource.asObservable();

  toggleSidenav(): void {
    this.toggleSidenavSource.next();
  }
}
