import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly systemPrefersDark = signal(false);

  readonly mode = signal<ThemeMode>(this.readInitialMode());

  readonly resolved = computed<ResolvedTheme>(() => {
    const m = this.mode();
    if (m === 'dark') return 'dark';
    if (m === 'light') return 'light';
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark.set(mql.matches);
      mql.addEventListener('change', (e) => this.systemPrefersDark.set(e.matches));
    }

    effect(() => {
      const dark = this.resolved() === 'dark';
      const html = this.document.documentElement;
      html.classList.toggle('dark', dark);
      html.style.colorScheme = dark ? 'dark' : 'light';
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(STORAGE_KEY, this.mode());
      }
    });
  }

  setMode(m: ThemeMode): void {
    this.mode.set(m);
  }

  private readInitialMode(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) return 'system';
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  }
}
