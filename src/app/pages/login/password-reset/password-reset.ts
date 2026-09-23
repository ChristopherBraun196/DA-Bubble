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
/** Form that requests a password reset email for a given address. */
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

  /** Whether the email field should be shown in its error state. */
  protected emailHasError(): boolean {
    return this.form.controls.email.invalid && this.form.controls.email.touched;
  }

  /** Clears the success toast and error message when the input changes. */
  protected clearSubmitState(): void {
    this.resetSent.set(false);
    this.submitError.set('');
  }

  /**
   * Sends the reset email for the entered address.
   *
   * @remarks
   * An invalid form only marks the fields as touched, so the error message
   * appears below the input instead of submitting.
   */
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

  /**
   * Turns a Firebase error code into a message shown below the field.
   *
   * @param error - The caught error.
   * @returns A readable German message.
   */
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
