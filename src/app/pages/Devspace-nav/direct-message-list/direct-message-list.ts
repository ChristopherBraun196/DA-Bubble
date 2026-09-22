import { Component, computed, inject, input, output, signal } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserListItem } from '../user-list-item/user-list-item';

export interface DirectMessageUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  isCurrentUser?: boolean;
}

@Component({
  imports: [UserListItem],
  selector: 'app-direct-message-list',
  styleUrl: './direct-message-list.scss',
  templateUrl: './direct-message-list.html',
})
export class DirectMessageList {
  private readonly auth = inject(AuthService);
  private readonly userDirectory = inject(UserService);

  readonly activeUserId = input<string | null>(null);
  readonly userSelected = output<DirectMessageUser>();

  protected readonly expanded = signal(true);
  protected readonly error = signal('');

  /** Der eingeloggte User steht immer an erster Stelle. */
  private readonly currentUser = computed<DirectMessageUser>(() => ({
    id: this.auth.currentUser()?.uid ?? 'me',
    name: `${this.auth.displayName()} (Du)`,
    avatar: this.auth.photoURL(),
    online: true,
    isCurrentUser: true,
  }));

  private readonly otherUsers = signal<DirectMessageUser[]>([]);

  protected readonly users = computed<DirectMessageUser[]>(() => [
    this.currentUser(),
    ...this.otherUsers(),
  ]);

  constructor() {
    void this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    try {
      this.otherUsers.set(this.toDirectMessageUsers(await this.userDirectory.getAllUsers()));
    } catch {
      this.error.set('Die Nutzerliste konnte nicht geladen werden.');
    }
  }

  /** Gastkonten und der eigene Account stehen nicht in der Liste. */
  private toDirectMessageUsers(users: UserSearchResult[]): DirectMessageUser[] {
    const currentUserId = this.auth.currentUser()?.uid;

    return users
      .filter(({ uid, displayName }) => uid !== currentUserId && !this.isGuest(displayName))
      .map(({ uid, displayName, photoURL }) => ({
        id: uid,
        name: displayName,
        avatar: photoURL,
        online: false,
      }));
  }

  private isGuest(displayName: string): boolean {
    return displayName.trim().toLocaleLowerCase('de-DE') === 'gast';
  }

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}
