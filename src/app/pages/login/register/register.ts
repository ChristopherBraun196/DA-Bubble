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

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveRegistrationDraft();
    void this.router.navigateByUrl('/choose-avatar');
  }

  protected emailHasError(): boolean {
    return this.form.controls.email.invalid && this.form.controls.email.touched;
  }

  protected passwordHasError(): boolean {
    return this.form.controls.password.invalid && this.form.controls.password.touched;
  }

  protected emailErrorMessage(): string {
    return '*Diese E-Mail-Adresse ist leider ungültig.';
  }

  protected passwordErrorMessage(): string {
    if (this.form.controls.password.hasError('minlength')) {
      return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    }

    return 'Bitte geben Sie ein Passwort ein.';
  }

  private saveRegistrationDraft(): void {
    const { name, email, password, privacyAccepted } = this.form.getRawValue();
    this.registrationDraft.set({
      displayName: name.trim(),
      email: email.trim(),
      password,
      privacyAccepted,
    });
  }

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
