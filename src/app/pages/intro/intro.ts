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

  ngOnDestroy(): void {
    if (this.fallbackTimerId !== null) {
      window.clearTimeout(this.fallbackTimerId);
    }
  }

  /** Opens the login shell after the intro transition has completed. */
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

  private forceLoginNavigation(): void {
    if (this.router.url !== '/login') {
      window.location.assign('/login');
    }
  }
}
