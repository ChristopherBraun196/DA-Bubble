import { afterNextRender, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { RegistrationDraftService } from '../../../core/services/registration-draft.service';
import { Header } from '../shared/header/header';

@Component({
  imports: [Header, ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
/**
 * Registration form collecting name, email, password and consent.
 *
 * @remarks
 * Does not create the account — the values are handed to
 * {@link RegistrationDraftService} and the account is created once the user
 * has picked an avatar on the next screen.
 */
export class Register {
  private readonly registrationDraft = inject(RegistrationDraftService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    privacyAccepted: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  constructor() {
    const draft = this.registrationDraft.draft();

    if (draft) {
      this.form.setValue({
        name: draft.displayName,
        email: draft.email,
        password: draft.password,
        privacyAccepted: draft.privacyAccepted,
      });
      return;
    }

    afterNextRender(() => this.resetFormAfterReload());
  }

  /** Validates the form and continues to the avatar step. */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveRegistrationDraft();
    void this.router.navigateByUrl('/choose-avatar');
  }

  /** Whether the email field should be shown in its error state. */
  protected emailHasError(): boolean {
    return this.form.controls.email.invalid && this.form.controls.email.touched;
  }

  /** Whether the password field should be shown in its error state. */
  protected passwordHasError(): boolean {
    return this.form.controls.password.invalid && this.form.controls.password.touched;
  }

  /** The message shown below the email field. */
  protected emailErrorMessage(): string {
    return '*Diese E-Mail-Adresse ist leider ungültig.';
  }

  /** The message shown below the password field. */
  protected passwordErrorMessage(): string {
    if (this.form.controls.password.hasError('minlength')) {
      return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    }

    return 'Bitte geben Sie ein Passwort ein.';
  }

  /** Hands the entered values to the draft service before navigating on. */
  private saveRegistrationDraft(): void {
    const { name, email, password, privacyAccepted } = this.form.getRawValue();
    this.registrationDraft.set({
      displayName: name.trim(),
      email: email.trim(),
      password,
      privacyAccepted,
    });
  }

  /**
   * Empties the form after a page reload.
   *
   * @remarks
   * Browsers restore form values on reload, which would leave a stale password
   * in the field without this.
   */
  private resetFormAfterReload(): void {
    const [navigationEntry] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];

    if (navigationEntry?.type !== 'reload') {
      return;
    }

    this.form.reset({
      name: '',
      email: '',
      password: '',
      privacyAccepted: false,
    });
  }
}
