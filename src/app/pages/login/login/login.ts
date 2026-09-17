import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
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

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    await this.authenticate(() => this.auth.loginWithEmail(email, password));
  }

  protected async loginWithGoogle(): Promise<void> {
    await this.authenticate(() => this.auth.loginWithGoogle());
  }

  protected async loginAsGuest(): Promise<void> {
    await this.authenticate(() => this.auth.loginAsGuest());
  }

  protected clearLoginError(): void {
    this.loginError.set(false);
    this.loginErrorMessage.set('');
  }

  private async authenticate(action: () => Promise<unknown>): Promise<void> {
    if (this.loginPending()) {
      return;
    }

    this.loginPending.set(true);
    this.loginError.set(false);
    this.loginErrorMessage.set('');

    try {
      await action();
      await this.router.navigateByUrl('/main', { replaceUrl: true });
    } catch (error) {
      console.error('Firebase login failed:', error);
      this.loginError.set(true);
      this.loginErrorMessage.set(this.resolveLoginErrorMessage(error));
    } finally {
      this.loginPending.set(false);
    }
  }

  private resolveLoginErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.';
    }

    switch (error.code) {
      case 'auth/network-request-failed':
        return 'Keine Verbindung zu Firebase. Bitte prüfe deine Internetverbindung.';
      case 'auth/popup-closed-by-user':
        return 'Die Google-Anmeldung wurde abgebrochen.';
      case 'auth/popup-blocked':
        return 'Das Google-Anmeldefenster wurde vom Browser blockiert.';
      case 'auth/operation-not-allowed':
      case 'auth/admin-restricted-operation':
        return 'Diese Anmeldemethode ist in Firebase nicht freigeschaltet.';
      case 'permission-denied':
        return 'Firebase hat den Datenbankzugriff abgelehnt.';
      default:
        return 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.';
    }
  }
}
