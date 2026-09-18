import { Component, computed, inject, input, output, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { UserListItem } from '../user-list-item/user-list-item';

export interface DirectMessageUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

@Component({
  imports: [UserListItem],
  selector: 'app-direct-message-list',
  styleUrl: './direct-message-list.scss',
  templateUrl: './direct-message-list.html',
})
export class DirectMessageList {
  private readonly auth = inject(AuthService);

  readonly activeUserId = input<string | null>(null);
  readonly userSelected = output<string>();

  protected readonly expanded = signal(true);

  /** Der eingeloggte User steht immer an erster Stelle. */
  private readonly currentUser = computed<DirectMessageUser>(() => ({
    id: this.auth.currentUser()?.uid ?? 'me',
    name: `${this.auth.displayName()} (Du)`,
    avatar: this.auth.photoURL(),
    online: true,
  }));

  /** Platzhalter, kommt spaeter aus Firebase. */
  private readonly otherUsers = signal<DirectMessageUser[]>([
    { id: 'sofia', name: 'Sofia Müller', avatar: '/img/Profile_picture_2.png', online: true },
    { id: 'noah', name: 'Noah Braun', avatar: '/img/Profile_picture_3.png', online: true },
    { id: 'elise', name: 'Elise Roth', avatar: '/img/Profile_picture_4.png', online: false },
    { id: 'elias', name: 'Elias Neumann', avatar: '/img/Profile_picture_5.png', online: true },
    { id: 'steffen', name: 'Steffen Hoffmann', avatar: '/img/Profile_picture_6.png', online: true },
  ]);

  protected readonly users = computed<DirectMessageUser[]>(() => [
    this.currentUser(),
    ...this.otherUsers(),
  ]);

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}
