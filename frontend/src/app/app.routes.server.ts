import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'onboarding', renderMode: RenderMode.Server },
  { path: 'rooms/:id', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Server },
];
