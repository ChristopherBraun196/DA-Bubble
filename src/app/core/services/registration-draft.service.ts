import { Injectable, signal } from '@angular/core';

export interface RegistrationDraft {
  displayName: string;
  email: string;
  password: string;
  privacyAccepted: boolean;
}

@Injectable({ providedIn: 'root' })
/**
 * Holds the registration form data while the user picks an avatar.
 *
 * @remarks
 * The account is only created on the avatar screen, so the credentials entered
 * on the previous step have to survive the navigation in memory.
 */
export class RegistrationDraftService {
  private readonly draftState = signal<RegistrationDraft | null>(null);

  readonly draft = this.draftState.asReadonly();

  /**
   * Stores the form data of the registration step.
   *
   * @param draft - The values entered so far.
   */
  set(draft: RegistrationDraft): void {
    this.draftState.set(draft);
  }

  /** Discards the draft once the account has been created or the flow was left. */
  clear(): void {
    this.draftState.set(null);
  }
}
