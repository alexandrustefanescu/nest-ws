import { Routes } from '@angular/router';
import { identityGuard } from './core/identity/auth-guard';

export const routes: Routes = [
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: '',
    canActivate: [identityGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/home-feed').then((m) => m.HomeFeed),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications').then((m) => m.Notifications),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/direct-messages').then((m) => m.DirectMessages),
      },
      {
        path: 'bookmarks',
        loadComponent: () =>
          import('./features/bookmarks/bookmarks').then((m) => m.Bookmarks),
      },
      {
        path: 'profile/:userId',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'rooms/:id',
        loadComponent: () => import('./features/room/room').then((m) => m.Room),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
