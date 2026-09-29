import { Component, computed, inject, input, output, signal } from '@angular/core';

import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { AvatarPicker } from '../../../shared/avatar-picker/avatar-picker';

/** Shown when saving the name or avatar fails. */
const SAVE_ERROR_MESSAGE =
  'Die Änderungen konnten nicht gespeichert werden. Versuch es noch einmal.';

@Component({
  imports: [AvatarFallback, AvatarPicker],
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
  private readonly users = inject(UserService);

  readonly user = input<AppUser | null>(null);
  readonly closed = output<void>();
  readonly messageRequested = output<AppUser>();

  /** Whether the dialog shows the signed-in user. */
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
  protected readonly online = computed(() => {
    if (this.isOwnProfile()) return true;
    const user = this.user();
    const lastSeenAt = this.users.directory().get(user?.uid || '')?.lastSeenAt ?? user?.lastSeenAt;
    return this.users.isOnline(lastSeenAt);
  });

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  protected readonly avatarDraft = signal('');

  /** Starts with the current name when editing begins. */
  protected readonly nameDraft = signal('');

  /** True once the name or avatar differs from what is saved, and the name is not empty. */
  protected readonly hasChanges = computed(() => {
    const name = this.nameDraft().trim();
    return (
      !!name && !/\d/.test(name) && (name !== this.name() || this.avatarDraft() !== this.avatar())
    );
  });

  /** True while the typed name contains a digit. */
  protected readonly nameHasDigits = computed(() => /\d/.test(this.nameDraft()));

  /** Switches into edit mode, starting from the current name and avatar. */
  protected startEdit(): void {
    this.nameDraft.set(this.name());
    this.saveError.set('');
    this.editing.set(true);
    this.avatarDraft.set(this.avatar());
  }

  /** Remembers the avatar the user clicked, without saving it yet. */
  protected selectAvatar(avatar: string): void {
    this.avatarDraft.set(avatar);
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
   * Persists the edited name and avatar
   *
   * @remarks
   * A blank draft simply closes edit mode, leaving the current name in place.
   */
  protected async save(): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.persistChanges();
      this.editing.set(false);
    } catch {
      this.saveError.set(SAVE_ERROR_MESSAGE);
    } finally {
      this.saving.set(false);
    }
  }

  /** Writes name and avatar, each only when the user actually changed it. */
  private async persistChanges(): Promise<void> {
    const name = this.nameDraft().trim();

    if (name && name !== this.name()) {
      await this.auth.updateDisplayName(name);
    }

    if (this.avatarDraft() && this.avatarDraft() !== this.avatar()) {
      await this.auth.updatePhotoURL(this.avatarDraft());
    }
  }
}
