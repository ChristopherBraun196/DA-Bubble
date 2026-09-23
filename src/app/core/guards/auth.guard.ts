import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Route guard that only admits authenticated users.
 *
 * @remarks
 * Waits for the initial Firebase Auth check to finish before deciding, so a
 * page reload does not bounce a signed-in user back to the login screen.
 *
 * @returns `true` for signed-in users, otherwise a redirect to `/login`.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.authInitialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => (auth.currentUser() ? true : router.createUrlTree(['/login']))),
  );
};
