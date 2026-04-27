import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Identity } from './identity';

export const identityGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  const identity = inject(Identity);
  const router = inject(Router);
  return identity.userId() ? true : router.parseUrl('/onboarding');
};
