import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Identity } from './identity';

export const identityGuard: CanActivateFn = () => {
  const identity = inject(Identity);
  const router = inject(Router);
  return identity.userId() ? true : router.parseUrl('/onboarding');
};
