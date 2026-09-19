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

  async ngOnInit(): Promise<void> {
    await this.verifyResetLink();
  }

  protected formDisabled(): boolean {
    return this.form.invalid || this.linkPending() || Boolean(this.linkError());
  }

  protected clearSubmitError(): void {
    this.submitError.set('');
  }

  protected errorMessage(): string {
    if (this.submitError()) return this.submitError();
    if (this.linkError()) return this.linkError();
    if (this.passwordIsTooShort()) return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    if (this.passwordsDiffer()) return 'Ihre Kennwörter stimmen nicht überein.';
    return '';
  }

  protected async onSubmit(): Promise<void> {
    if (this.formDisabled() || this.resetPending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.resetPending.set(true);
    this.submitError.set('');
    await this.submitPassword();
  }

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

  private async submitPassword(): Promise<void> {
    try {
      await this.auth.resetPassword(this.actionCode, this.form.controls.password.getRawValue());
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      this.submitError.set(this.resolveResetError(error));
      this.resetPending.set(false);
    }
  }

  private passwordIsTooShort(): boolean {
    const password = this.form.controls.password;
    return password.touched && password.hasError('minlength');
  }

  private passwordsDiffer(): boolean {
    return this.form.controls.confirmation.touched && this.form.hasError('passwordMismatch');
  }

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
