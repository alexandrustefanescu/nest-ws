import { Routes } from '@angular/router';
import { identityGuard } from './core/identity/identity.guard';

export const routes: Routes = [
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: '',
    canActivate: [identityGuard],
    loadComponent: () => import('./features/shell/shell.page').then((m) => m.ShellPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/rooms/empty-room.page').then((m) => m.EmptyRoomPage),
      },
      {
        path: 'rooms/:id',
        loadComponent: () => import('./features/room/room.page').then((m) => m.RoomPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
