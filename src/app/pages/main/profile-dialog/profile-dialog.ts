import { Component, computed, inject, output, signal } from '@angular/core';

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

  readonly closed = output<void>();

  protected readonly name = computed(() => this.auth.displayName());
  protected readonly avatar = computed(() => this.auth.photoURL());
  protected readonly email = computed(() => this.auth.email());

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
