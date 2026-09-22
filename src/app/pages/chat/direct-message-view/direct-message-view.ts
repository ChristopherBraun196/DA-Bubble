import { Component, computed, inject, input, signal } from '@angular/core';

import { AppUser } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { DirectMessageUser } from '../../Devspace-nav/direct-message-list/direct-message-list';
import { ProfileDialog } from '../../main/profile-dialog/profile-dialog';
import { MessageInput } from '../message-input/message-input';

@Component({
  imports: [MessageInput, AvatarFallback, ProfileDialog],
  selector: 'app-direct-message-view',
  styleUrl: './direct-message-view.scss',
  templateUrl: './direct-message-view.html',
})
export class DirectMessageView {
  private readonly users = inject(UserService);

  readonly user = input.required<DirectMessageUser>();

  protected readonly displayName = computed(() => this.user().name);
  protected readonly isCurrentUser = computed(() => this.user().isCurrentUser === true);
  protected readonly placeholder = computed(
    () => `Nachricht an ${this.displayName().replace(' (Du)', '')}`,
  );

  protected readonly profileOpen = signal(false);
  /** Null heisst eigenes Profil, sonst wird die Mitglieder-Ansicht gezeigt. */
  protected readonly profileUser = signal<AppUser | null>(null);

  protected async openProfile(): Promise<void> {
    if (this.isCurrentUser()) {
      this.profileUser.set(null);
      this.profileOpen.set(true);
      return;
    }
    const profile = await this.users.getProfile(this.user().id);
    if (!profile) {
      return;
    }
    this.profileUser.set(profile);
    this.profileOpen.set(true);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
    this.profileUser.set(null);
  }
}
