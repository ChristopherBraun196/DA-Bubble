import { Component, computed, inject, signal } from '@angular/core';
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

@Component({
  imports: [Header, RouterLink],
  selector: 'app-choose-avatar',
  styleUrl: './choose-avatar.scss',
  templateUrl: './choose-avatar.html',
})
export class ChooseAvatar {
  private readonly auth = inject(AuthService);
  private readonly registrationDraft = inject(RegistrationDraftService);
  private readonly router = inject(Router);

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

  constructor() {
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

  private async createAccount(registration: RegistrationDraft): Promise<void> {
    this.registrationPending.set(true);
    this.registrationError.set('');

    try {
      await this.registerWithSelectedAvatar(registration);
      this.registrationDraft.clear();
      await this.router.navigateByUrl('/main', { replaceUrl: true });
    } catch (error) {
      this.registrationError.set(this.resolveRegistrationError(error));
    } finally {
      this.registrationPending.set(false);
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
