import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';

import { AuthService } from '../../../core/services/auth.service';
import { Header } from '../shared/header/header';

@Component({
  imports: [Header, RouterLink, ReactiveFormsModule],
  selector: 'app-password-reset',
  styleUrl: './password-reset.scss',
  templateUrl: './password-reset.html',
})
export class PasswordReset {
  private readonly auth = inject(AuthService);

  protected readonly resetPending = signal(false);
  protected readonly resetSent = signal(false);
  protected readonly submitError = signal('');

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected emailHasError(): boolean {
    return this.form.controls.email.invalid && this.form.controls.email.touched;
  }

  protected clearSubmitState(): void {
    this.resetSent.set(false);
    this.submitError.set('');
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.resetPending()) {
      return;
    }

    this.resetPending.set(true);
    this.resetSent.set(false);
    this.submitError.set('');

    try {
      await this.auth.sendPasswordReset(this.form.controls.email.getRawValue().trim());
      this.resetSent.set(true);
    } catch (error) {
      console.error('Firebase password reset failed:', error);
      this.submitError.set(this.resolveResetErrorMessage(error));
    } finally {
      this.resetPending.set(false);
    }
  }

  private resolveResetErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Die E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es erneut.';
    }

    switch (error.code) {
      case 'auth/invalid-email':
        return 'Diese E-Mail-Adresse ist leider ungültig.';
      case 'auth/too-many-requests':
        return 'Zu viele Versuche. Bitte versuchen Sie es später erneut.';
      case 'auth/network-request-failed':
        return 'Keine Verbindung zu Firebase. Bitte prüfen Sie Ihre Internetverbindung.';
      default:
        return 'Die E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es erneut.';
    }
  }
}
