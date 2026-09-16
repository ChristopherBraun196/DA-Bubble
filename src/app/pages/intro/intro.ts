import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { IntroAnimation } from './components/intro-animation/intro-animation';

@Component({
  imports: [IntroAnimation],
  selector: 'app-intro',
  styleUrl: './intro.scss',
  templateUrl: './intro.html',
})
export class Intro {
  private readonly router = inject(Router);

  /** Opens the login shell after the intro transition has completed. */
  protected openLogin(): void {
    void this.router.navigateByUrl('/login');
  }
}
