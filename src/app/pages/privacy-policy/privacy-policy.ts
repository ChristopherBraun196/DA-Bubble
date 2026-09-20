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

// Back Button return to last page function
export class PrivacyPolicy {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected goBack(): void {
    if (history.state?.navigationId > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/login']);
  }
}
