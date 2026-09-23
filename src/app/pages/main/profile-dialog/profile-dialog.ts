import { Component, computed, inject, input, output, signal } from '@angular/core';

import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';

@Component({
  imports: [AvatarFallback],
  selector: 'app-profile-dialog',
  styleUrl: './profile-dialog.scss',
  templateUrl: './profile-dialog.html',
})
/**
 * Shows a user profile and lets the signed-in user rename themselves.
 *
 * @remarks
 * Serves both the own profile and other members' — editing is only offered
 * on the former.
 */
export class ProfileDialog {
  private readonly auth = inject(AuthService);

  readonly user = input<AppUser | null>(null);
  readonly closed = output<void>();
  readonly messageRequested = output<AppUser>();

  /** Whether the dialog shows the signed-in user, which unlocks editing. */
  protected readonly isOwnProfile = computed(
    () => !this.user() || this.user()?.uid === this.auth.currentUser()?.uid,
  );
  protected readonly name = computed(() =>
    this.isOwnProfile() ? this.auth.displayName() : this.user()?.displayName || '',
  );
  protected readonly avatar = computed(() =>
    this.isOwnProfile() ? this.auth.photoURL() : this.user()?.photoURL || '',
  );
  protected readonly email = computed(() =>
    this.isOwnProfile() ? this.auth.email() : this.user()?.email || null,
  );

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');

  /** Startet leer, der aktuelle Name steht als Platzhalter im Feld. */
  protected readonly nameDraft = signal('');

  /** Switches the name into edit mode with an empty draft. */
  protected startEdit(): void {
    this.nameDraft.set('');
    this.saveError.set('');
    this.editing.set(true);
  }

  /** Leaves edit mode without saving. */
  protected cancelEdit(): void {
    this.editing.set(false);
  }

  /**
   * Tracks what is typed into the name field.
   *
   * @param event - The input event of the text field.
   */
  protected updateNameDraft(event: Event): void {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

  /**
   * Persists the new display name.
   *
   * @remarks
   * A blank draft simply closes edit mode, leaving the current name in place.
   */
  protected async save(): Promise<void> {
    const name = this.nameDraft().trim();

    if (!name) {
      this.editing.set(false);
      return;
    }

    this.saving.set(true);
    this.saveError.set('');

    try {
      await this.auth.updateDisplayName(name);
      this.editing.set(false);
    } catch {
      this.saveError.set('Der Name konnte nicht gespeichert werden. Versuch es noch einmal.');
    } finally {
      this.saving.set(false);
    }
  }
}
