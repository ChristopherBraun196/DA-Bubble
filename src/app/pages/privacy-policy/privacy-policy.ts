import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Header } from '../login/shared/header/header';

@Component({
  imports: [Header],
  selector: 'app-privacy-policy',
  styleUrl: './privacy-policy.scss',
  templateUrl: './privacy-policy.html',
})
/** Static privacy policy page with a back link to wherever the user came from. */
export class PrivacyPolicy {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  /**
   * Returns to the previous page.
   *
   * @remarks
   * Falls back to `/login` when this page was opened directly, since going
   * back would otherwise leave the application.
   */
  protected goBack(): void {
    if (history.state?.navigationId > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/login']);
  }
}
