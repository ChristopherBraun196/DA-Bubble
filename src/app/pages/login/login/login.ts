import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';

import { AuthService } from '../../../core/services/auth.service';

/** Messages for the Firebase error codes the login can run into. */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  'auth/network-request-failed':
    'Keine Verbindung zu Firebase. Bitte prüfe deine Internetverbindung.',
  'auth/popup-closed-by-user': 'Die Google-Anmeldung wurde abgebrochen.',
  'auth/popup-blocked': 'Das Google-Anmeldefenster wurde vom Browser blockiert.',
  'auth/operation-not-allowed': 'Diese Anmeldemethode ist in Firebase nicht freigeschaltet.',
  'auth/admin-restricted-operation': 'Diese Anmeldemethode ist in Firebase nicht freigeschaltet.',
  'permission-denied': 'Firebase hat den Datenbankzugriff abgelehnt.',
};

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
/**
 * Sign-in page offering email, Google and guest access.
 *
 * @remarks
 * All three paths run through {@link Login.authenticate}, so pending state and
 * error handling stay in one place.
 */
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loginPending = signal(false);
  protected readonly loginError = signal(false);
  protected readonly loginErrorMessage = signal('');

  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /** Signs in with the credentials entered in the form. */
  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    await this.authenticate(() => this.auth.loginWithEmail(email, password));
  }

  /** Signs in through the Google popup. */
  protected async loginWithGoogle(): Promise<void> {
    await this.authenticate(() => this.auth.loginWithGoogle());
  }

  /** Signs in anonymously. */
  protected async loginAsGuest(): Promise<void> {
    await this.authenticate(() => this.auth.loginAsGuest());
  }

  /** Clears the error banner as soon as the user edits the form again. */
  protected clearLoginError(): void {
    this.loginError.set(false);
    this.loginErrorMessage.set('');
  }

  /**
   * Runs a sign-in attempt with shared pending and error handling.
   *
   * @param action - The sign-in call to execute.
   */
  private async authenticate(action: () => Promise<unknown>): Promise<void> {
    if (this.loginPending()) {
      return;
    }

    this.loginPending.set(true);
    this.clearLoginError();
    try {
      await action();
      await this.router.navigateByUrl('/main', { replaceUrl: true });
    } catch (error) {
      this.showLoginError(error);
    } finally {
      this.loginPending.set(false);
    }
  }

  /**
   * Logs a failed sign-in and shows the matching message below the form.
   *
   * @param error - The caught error.
   */
  private showLoginError(error: unknown): void {
    console.error('Firebase login failed:', error);
    this.loginError.set(true);
    this.loginErrorMessage.set(this.resolveLoginErrorMessage(error));
  }

  /**
   * Turns a Firebase error code into a message shown below the field.
   *
   * @param error - The caught error.
   * @returns A readable German message.
   */
  private resolveLoginErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.';
    }

    return (
      LOGIN_ERROR_MESSAGES[error.code] ??
      'Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.'
    );
  }
}
