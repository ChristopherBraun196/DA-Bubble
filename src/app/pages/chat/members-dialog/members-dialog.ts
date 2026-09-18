import { Component, computed, inject, output, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { UserListItem } from '../../Devspace-nav/user-list-item/user-list-item';

export interface ChannelMember {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

@Component({
  imports: [UserListItem],
  selector: 'app-members-dialog',
  styleUrl: './members-dialog.scss',
  templateUrl: './members-dialog.html',
})
export class MembersDialog {
  private readonly auth = inject(AuthService);

  readonly closed = output<void>();
  readonly addRequested = output<void>();

  /** Der eingeloggte User steht immer an erster Stelle. */
  private readonly currentUser = computed<ChannelMember>(() => ({
    id: this.auth.currentUser()?.uid ?? 'me',
    name: `${this.auth.displayName()} (Du)`,
    avatar: this.auth.photoURL(),
    online: true,
  }));

  /** Platzhalter, kommt spaeter aus Firebase. */
  private readonly otherMembers = signal<ChannelMember[]>([
    { id: 'sofia', name: 'Sofia Müller', avatar: '/img/Profile_picture_2.png', online: true },
    { id: 'noah', name: 'Noah Braun', avatar: '/img/Profile_picture_3.png', online: true },
  ]);

  protected readonly members = computed<ChannelMember[]>(() => [
    this.currentUser(),
    ...this.otherMembers(),
  ]);

  protected addMembers(): void {
    this.addRequested.emit();
  }
}
