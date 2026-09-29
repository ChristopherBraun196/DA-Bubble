import { Component, computed, inject, input, output, signal } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserListItem } from '../user-list-item/user-list-item';

/** A person shown in the direct message list. */
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
/**
 * Collapsible list of everyone the user can write to.
 *
 * @remarks
 * Lists the whole directory rather than just existing conversations, plus one
 * temporary entry for a person the user just started writing to.
 */
export class DirectMessageList {
  private readonly auth = inject(AuthService);
  private readonly userDirectory = inject(UserService);

  readonly activeUserId = input<string | null>(null);
  readonly temporaryUser = input<DirectMessageUser | null>(null);
  readonly userSelected = output<DirectMessageUser>();

  protected readonly expanded = signal(true);

  /** The signed-in user is always listed first. */
  private readonly currentUser = computed<DirectMessageUser>(() => ({
    id: this.auth.currentUser()?.uid ?? 'me',
    name: `${this.auth.displayName()} (Du)`,
    avatar: this.auth.photoURL(),
    online: true,
    isCurrentUser: true,
  }));

  /** Everyone else from the live user directory, updated whenever a profile changes. */
  private readonly otherUsers = computed(() =>
    this.toDirectMessageUsers([...this.userDirectory.directory().values()]),
  );

  protected readonly users = computed<DirectMessageUser[]>(() => {
    const currentUser = this.currentUser();
    const otherUsers = this.otherUsers();
    const temporaryUser = this.temporaryUser();
    const temporaryUsers = this.getTemporaryUsers(temporaryUser, currentUser.id, otherUsers);
    return [currentUser, ...temporaryUsers, ...otherUsers];
  });

  /**
   * Maps loaded users into list rows, leaving out the signed-in user and inactive guests.
   *
   * @param users - The resolved conversation partners.
   * @returns The rows to render.
   */
  private toDirectMessageUsers(users: (UserSearchResult | null)[]): DirectMessageUser[] {
    const currentUserId = this.auth.currentUser()?.uid;

    return users
      .filter((user): user is UserSearchResult => !!user)
      .filter(
        ({ uid, isAnonymous, lastSeenAt }) =>
          uid !== currentUserId && (!isAnonymous || this.userDirectory.isOnline(lastSeenAt)),
      )
      .map(({ uid, displayName, photoURL, lastSeenAt }) => ({
        id: uid,
        name: displayName,
        avatar: photoURL,
        online: this.userDirectory.isOnline(lastSeenAt),
      }))
      .sort((first, second) => first.name.localeCompare(second.name, 'de'));
  }

  /** Returns the freshly selected partner when no conversation exists yet. */
  private getTemporaryUsers(
    user: DirectMessageUser | null,
    currentUserId: string,
    persistedUsers: DirectMessageUser[],
  ): DirectMessageUser[] {
    const alreadyVisible = persistedUsers.some(({ id }) => id === user?.id);
    return user && user.id !== currentUserId && !alreadyVisible ? [user] : [];
  }

  /** Collapses or expands the list. */
  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}
