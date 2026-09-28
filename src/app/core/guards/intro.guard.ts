import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Marks a hard jump to the login page that must not be sent back to the intro. */
const BYPASS_KEY = 'dabubble.skip-intro';

/**
 * Sends a direct hit on the login page through the intro first.
 *
 * @remarks
 * `Router.navigated` stays false while the app's very first navigation runs,
 * which is exactly what a reload or a pasted link looks like. Arriving from
 * the intro counts as a later navigation and passes straight through.
 *
 * @returns `true` for in-app navigations, otherwise a redirect to the intro.
 */
export const introGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (router.navigated || consumeIntroBypass()) {
    return true;
  }

  return router.createUrlTree(['/']);
};

/**
 * Lets the next direct load of the login page skip the intro.
 *
 * @remarks
 * Used by the intro's own escape hatch, which reloads the page when the
 * animation never reports completion. Without the marker that reload would be
 * sent back to the intro and could bounce forever.
 */
export function skipIntroOnce(): void {
  try {
    sessionStorage.setItem(BYPASS_KEY, '1');
  } catch {
    // Storage kann blockiert sein - dann bleibt es beim normalen Weg.
  }
}

/**
 * Reads the marker and clears it, so it only ever applies to one load.
 *
 * @returns True when the intro should be skipped this once.
 */
function consumeIntroBypass(): boolean {
  try {
    const marked = sessionStorage.getItem(BYPASS_KEY) !== null;
    sessionStorage.removeItem(BYPASS_KEY);
    return marked;
  } catch {
    return false;
  }
}
