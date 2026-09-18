import { Injectable, signal } from '@angular/core';

export interface RegistrationDraft {
  displayName: string;
  email: string;
  password: string;
  privacyAccepted: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegistrationDraftService {
  private readonly draftState = signal<RegistrationDraft | null>(null);

  readonly draft = this.draftState.asReadonly();

  set(draft: RegistrationDraft): void {
    this.draftState.set(draft);
  }

  clear(): void {
    this.draftState.set(null);
  }
}
