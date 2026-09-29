import { Injectable, signal } from '@angular/core';

/** A request to open the direct conversation with a user. */
export interface DirectMessageRequest {
  userId: string;
}

/**
 * Carries "write to this user" requests from inside the chat to the workspace shell.
 *
 * @remarks
 * Every request is a new object, so asking for the same user twice still
 * notifies listeners.
 */
@Injectable({ providedIn: 'root' })
export class DirectMessageRequestService {
  private readonly requestState = signal<DirectMessageRequest | null>(null);
  readonly request = this.requestState.asReadonly();

  /**
   * Asks the workspace to open the conversation with a user.
   *
   * @param userId - The user to write to.
   */
  open(userId: string): void {
    this.requestState.set({ userId });
  }
}
