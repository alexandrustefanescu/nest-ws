import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IdentityService } from './identity.service';

export const identityGuard: CanActivateFn = () => {
  const identity = inject(IdentityService);
  const router = inject(Router);
  return identity.userId() ? true : router.parseUrl('/onboarding');
};
