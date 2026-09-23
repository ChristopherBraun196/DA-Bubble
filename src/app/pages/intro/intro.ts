import { afterNextRender, Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';

import { IntroAnimation } from './components/intro-animation/intro-animation';

const LOGIN_FALLBACK_DELAY = 3500;

@Component({
  imports: [IntroAnimation],
  selector: 'app-intro',
  styleUrl: './intro.scss',
  templateUrl: './intro.html',
})
/**
 * Landing page showing the opening animation before the login screen.
 *
 * @remarks
 * A fallback timer forces the navigation even if the animation never reports
 * completion, so the app can never get stuck on the intro.
 */
export class Intro implements OnDestroy {
  private readonly router = inject(Router);
  private fallbackTimerId: number | null = null;
  private navigationStarted = false;

  constructor() {
    afterNextRender(() => {
      this.fallbackTimerId = window.setTimeout(
        () => this.forceLoginNavigation(),
        LOGIN_FALLBACK_DELAY,
      );
    });
  }

  /** Cancels the fallback timer when the intro is left. */
  ngOnDestroy(): void {
    if (this.fallbackTimerId !== null) {
      window.clearTimeout(this.fallbackTimerId);
    }
  }

  /** Opens the login shell after the intro transition has completed. */
  /** Navigates to the login screen, guarding against a double trigger. */
  protected async openLogin(): Promise<void> {
    if (this.navigationStarted) {
      return;
    }

    this.navigationStarted = true;

    try {
      const navigationSucceeded = await this.router.navigateByUrl('/login');

      if (!navigationSucceeded && this.router.url !== '/login') {
        this.forceLoginNavigation();
      }
    } catch (error) {
      console.error('Navigation to login failed:', error);
      this.forceLoginNavigation();
    }
  }

  /** Fallback that leaves the intro when the animation failed to finish. */
  private forceLoginNavigation(): void {
    if (this.router.url !== '/login') {
      window.location.assign('/login');
    }
  }
}
