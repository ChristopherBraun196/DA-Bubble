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
export class ProfileDialog {
  private readonly auth = inject(AuthService);

  readonly user = input<AppUser | null>(null);
  readonly closed = output<void>();
  readonly messageRequested = output<AppUser>();

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

  protected startEdit(): void {
    this.nameDraft.set('');
    this.saveError.set('');
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected updateNameDraft(event: Event): void {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

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
