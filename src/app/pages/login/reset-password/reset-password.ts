import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';

import { AuthService } from '../../../core/services/auth.service';
import { Header } from '../shared/header/header';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmation')?.value;

  if (!password || !confirmation || password === confirmation) {
    return null;
  }

  return { passwordMismatch: true };
};

@Component({
  imports: [Header, ReactiveFormsModule, RouterLink],
  selector: 'app-reset-password',
  styleUrl: './reset-password.scss',
  templateUrl: './reset-password.html',
})
/**
 * Sets a new password using the code from the reset email.
 *
 * @remarks
 * The `oobCode` query parameter is verified on load, so an expired link fails
 * before the user types anything.
 */
export class ResetPassword implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly actionCode = this.route.snapshot.queryParamMap.get('oobCode') ?? '';

  protected readonly linkPending = signal(true);
  protected readonly linkError = signal('');
  protected readonly resetPending = signal(false);
  protected readonly submitError = signal('');

  protected readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmation: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsMatch },
  );

  /** Verifies the reset code carried by the link. */
  async ngOnInit(): Promise<void> {
    await this.verifyResetLink();
  }

  /** Whether the form should be blocked, for example while the link is checked. */
  protected formDisabled(): boolean {
    return this.form.invalid || this.linkPending() || Boolean(this.linkError());
  }

  /** Clears the error message when the user edits the form. */
  protected clearSubmitError(): void {
    this.submitError.set('');
  }

  /** The message shown below the password fields. */
  protected errorMessage(): string {
    if (this.submitError()) return this.submitError();
    if (this.linkError()) return this.linkError();
    if (this.passwordIsTooShort()) return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    if (this.passwordsDiffer()) return 'Ihre Kennwörter stimmen nicht überein.';
    return '';
  }

  /** Validates both fields and stores the new password. */
  protected async onSubmit(): Promise<void> {
    if (this.formDisabled() || this.resetPending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.resetPending.set(true);
    this.submitError.set('');
    await this.submitPassword();
  }

  /** Checks the code from the email and blocks the form when it expired. */
  private async verifyResetLink(): Promise<void> {
    if (!this.actionCode) {
      this.linkError.set('Der Link zum Zurücksetzen ist unvollständig.');
      this.linkPending.set(false);
      return;
    }

    try {
      await this.auth.verifyPasswordReset(this.actionCode);
    } catch {
      this.linkError.set('Der Link ist ungültig oder bereits abgelaufen.');
    } finally {
      this.linkPending.set(false);
    }
  }

  /** Applies the new password and returns to the login page. */
  private async submitPassword(): Promise<void> {
    try {
      await this.auth.resetPassword(this.actionCode, this.form.controls.password.getRawValue());
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      this.submitError.set(this.resolveResetError(error));
      this.resetPending.set(false);
    }
  }

  /** Whether the entered password misses the minimum length. */
  private passwordIsTooShort(): boolean {
    const password = this.form.controls.password;
    return password.touched && password.hasError('minlength');
  }

  /** Whether both password fields disagree. */
  private passwordsDiffer(): boolean {
    return this.form.controls.confirmation.touched && this.form.hasError('passwordMismatch');
  }

  /**
   * Turns a Firebase error code into a message shown on the form.
   *
   * @param error - The caught error.
   * @returns A readable German message.
   */
  private resolveResetError(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Das Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.';
    }

    if (error.code === 'auth/weak-password') return 'Das Passwort ist zu schwach.';
    if (error.code === 'auth/network-request-failed') return 'Keine Verbindung zu Firebase.';
    if (error.code === 'auth/expired-action-code') return 'Der Link ist bereits abgelaufen.';
    if (error.code === 'auth/invalid-action-code') return 'Der Link ist ungültig.';
    return 'Das Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.';
  }
}
