import { Routes } from '@angular/router';
import { identityGuard } from './core/identity/identity.guard';

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
          import('./features/rooms/empty-room').then((m) => m.EmptyRoom),
      },
      {
        path: 'rooms/:id',
        loadComponent: () => import('./features/room/room').then((m) => m.Room),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
