import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';

import { AuthService } from '../../../core/services/auth.service';
import {
  RegistrationDraft,
  RegistrationDraftService,
} from '../../../core/services/registration-draft.service';
import { Header } from '../shared/header/header';

const REGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Für diese E-Mail-Adresse besteht bereits ein Konto.',
  'auth/invalid-email': 'Diese E-Mail-Adresse ist leider ungültig.',
  'auth/network-request-failed':
    'Keine Verbindung zu Firebase. Bitte prüfe deine Internetverbindung.',
  'auth/weak-password': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
  'permission-denied': 'Firebase hat das Speichern des Profils abgelehnt.',
};

const DEFAULT_REGISTRATION_ERROR =
  'Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.';
const SUCCESS_OVERLAY_DURATION = 1300;
const MAIN_TRANSITION_DURATION = 200;

@Component({
  imports: [Header, RouterLink],
  selector: 'app-choose-avatar',
  styleUrl: './choose-avatar.scss',
  templateUrl: './choose-avatar.html',
})
export class ChooseAvatar {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registrationDraft = inject(RegistrationDraftService);
  private readonly router = inject(Router);
  private navigationTimerId?: number;

  protected readonly registration = this.registrationDraft.draft;
  protected readonly avatarPaths = Array.from(
    { length: 6 },
    (_, index) => `/img/Profile_picture_${index + 1}.png`,
  );
  protected readonly selectedAvatar = signal<string | null>(null);
  protected readonly displayedAvatar = computed(
    () => this.selectedAvatar() || '/img/Profile_Guest.png',
  );
  protected readonly registrationPending = signal(false);
  protected readonly registrationError = signal('');
  protected readonly accountCreated = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearNavigationTimer());

    if (!this.registration()) {
      void this.router.navigateByUrl('/register', { replaceUrl: true });
    }
  }

  protected selectAvatar(avatarPath: string): void {
    this.selectedAvatar.set(avatarPath);
    this.registrationError.set('');
  }

  protected async completeRegistration(): Promise<void> {
    const registration = this.registration();

    if (!registration || this.registrationPending()) {
      return;
    }

    await this.createAccount(registration);
  }

  protected beginMainTransition(): void {
    if (!this.accountCreated()) {
      return;
    }

    this.accountCreated.set(false);
    this.clearNavigationTimer();
    this.navigationTimerId = window.setTimeout(
      () => void this.navigateToMain(),
      MAIN_TRANSITION_DURATION,
    );
  }

  private async createAccount(registration: RegistrationDraft): Promise<void> {
    this.registrationPending.set(true);
    this.registrationError.set('');

    try {
      await this.registerWithSelectedAvatar(registration);
      this.showSuccessOverlay();
    } catch (error) {
      this.registrationError.set(this.resolveRegistrationError(error));
      this.registrationPending.set(false);
    }
  }

  private showSuccessOverlay(): void {
    this.accountCreated.set(true);
    this.navigationTimerId = window.setTimeout(
      () => this.beginMainTransition(),
      SUCCESS_OVERLAY_DURATION,
    );
  }

  private async navigateToMain(): Promise<void> {
    const navigationSucceeded = await this.router.navigateByUrl('/main', { replaceUrl: true });

    if (navigationSucceeded) {
      this.registrationDraft.clear();
      return;
    }

    this.registrationPending.set(false);
  }

  private clearNavigationTimer(): void {
    if (this.navigationTimerId !== undefined) {
      window.clearTimeout(this.navigationTimerId);
      this.navigationTimerId = undefined;
    }
  }

  private registerWithSelectedAvatar(registration: RegistrationDraft): Promise<unknown> {
    return this.auth.registerWithEmail(
      registration.email,
      registration.password,
      registration.displayName,
      this.displayedAvatar(),
    );
  }

  private resolveRegistrationError(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return DEFAULT_REGISTRATION_ERROR;
    }

    return REGISTRATION_ERROR_MESSAGES[error.code] || DEFAULT_REGISTRATION_ERROR;
  }
}
