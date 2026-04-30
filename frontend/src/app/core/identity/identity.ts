import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';

const STORAGE_KEY = 'userId';
const COOKIE_KEY = 'userId';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

@Injectable({ providedIn: 'root' })
export class Identity {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });

  private readonly _userId = signal<string>(this.read());
  readonly userId = this._userId.asReadonly();

  setUserId(name: string): void {
    const trimmed = name.trim();
    this._userId.set(trimmed);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      this.writeCookie(trimmed);
    }
  }

  private read(): string {
    if (this.isBrowser) {
      const fromCookie = readCookie(this.document.cookie, COOKIE_KEY);
      if (fromCookie) {
        try { localStorage.setItem(STORAGE_KEY, fromCookie); } catch {}
        return fromCookie;
      }
      const fromStorage = localStorage.getItem(STORAGE_KEY) ?? '';
      if (fromStorage) this.writeCookie(fromStorage);
      return fromStorage;
    }
    return readCookie(this.request?.headers.get('cookie') ?? '', COOKIE_KEY);
  }

  private writeCookie(value: string): void {
    const encoded = encodeURIComponent(value);
    this.document.cookie = `${COOKIE_KEY}=${encoded}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

function readCookie(header: string, key: string): string {
  if (!header) return '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(key + '=')) {
      return decodeURIComponent(trimmed.slice(key.length + 1));
    }
  }
  return '';
}
