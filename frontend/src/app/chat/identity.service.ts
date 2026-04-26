import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'userId';

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _userId = signal<string>(this.read());

  readonly userId = this._userId.asReadonly();

  setUserId(name: string): void {
    const trimmed = name.trim();
    this._userId.set(trimmed);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    }
  }

  clear(): void {
    this._userId.set('');
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private read(): string {
    if (!this.isBrowser) return '';
    return localStorage.getItem(STORAGE_KEY) ?? '';
  }
}
