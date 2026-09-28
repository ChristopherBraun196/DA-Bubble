import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
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
 * Collapsible list of direct message conversations.
 *
 * @remarks
 * Shows only partners an actual conversation exists with, plus one temporary
 * entry for a person the user just started writing to.
 */
export class DirectMessageList {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly userDirectory = inject(UserService);
  private loadVersion = 0;

  readonly activeUserId = input<string | null>(null);
  readonly temporaryUser = input<DirectMessageUser | null>(null);
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

  /** Guests have no conversations of their own to list. */
  private readonly guestSession = computed(() => this.auth.currentUser()?.isAnonymous === true);

  private readonly directUserIds = computed(() => {
    const currentUserId = this.auth.currentUser()?.uid;
    return [
      ...new Set(
        this.chats
          .chats()
          .filter(({ type, hasMessages }) => type === 'direct' && hasMessages)
          .flatMap(({ memberIds }) => memberIds)
          .filter((userId) => userId !== currentUserId),
      ),
    ];
  });

  protected readonly users = computed<DirectMessageUser[]>(() => {
    const currentUser = this.currentUser();
    const otherUsers = this.otherUsers();
    const temporaryUser = this.temporaryUser();
    const temporaryUsers = this.getTemporaryUsers(temporaryUser, currentUser.id, otherUsers);
    return [currentUser, ...temporaryUsers, ...otherUsers];
  });

  constructor() {
    effect(() => {
      const version = ++this.loadVersion;

      if (this.guestSession()) {
        void this.loadEveryone(version);
      } else {
        void this.loadUsers(this.directUserIds(), version);
      }
    });
  }

  /**
   * Resolves the conversation partners behind the given ids.
   *
   * @param userIds - Ids of the people to load.
   * @param version - Guards against results of a superseded load.
   */
  private async loadUsers(userIds: string[], version: number): Promise<void> {
    if (!userIds.length) {
      this.otherUsers.set([]);
      return;
    }

    await this.applyUsers(
      Promise.all(userIds.map((userId) => this.userDirectory.findById(userId))),
      version,
    );
  }

  /**
   * Loads everyone in the directory instead of just the own conversations.
   *
   * @param version - Guards against results of a superseded load.
   *
   * @remarks
   * A guest has nobody to talk to yet, so the whole list is offered. Other
   * guests are dropped in {@link DirectMessageList.toDirectMessageUsers}.
   */
  private async loadEveryone(version: number): Promise<void> {
    await this.applyUsers(this.userDirectory.getAllUsers(), version);
  }

  /**
   * Stores the resolved rows unless a newer load has started meanwhile.
   *
   * @param loading - The pending lookup.
   * @param version - The load this result belongs to.
   */
  private async applyUsers(
    loading: Promise<(UserSearchResult | null)[]>,
    version: number,
  ): Promise<void> {
    try {
      const users = await loading;
      if (version === this.loadVersion) this.otherUsers.set(this.toDirectMessageUsers(users));
    } catch {
      if (version === this.loadVersion)
        this.error.set('Die Nutzerliste konnte nicht geladen werden.');
    }
  }

  /**
   * Maps loaded users into list rows, leaving out the signed-in user and guests.
   *
   * @param users - The resolved conversation partners.
   * @returns The rows to render.
   */
  private toDirectMessageUsers(users: (UserSearchResult | null)[]): DirectMessageUser[] {
    const currentUserId = this.auth.currentUser()?.uid;

    return users
      .filter((user): user is UserSearchResult => !!user)
      .filter(({ uid, displayName }) => uid !== currentUserId && !this.isGuest(displayName))
      .map(({ uid, displayName, photoURL }) => ({
        id: uid,
        name: displayName,
        avatar: photoURL,
        online: false,
      }));
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

  /**
   * Detects guest accounts by their name.
   *
   * @param displayName - The stored display name.
   * @returns True for anonymous sessions.
   */
  private isGuest(displayName: string): boolean {
    return displayName.trim().toLocaleLowerCase('de-DE') === 'gast';
  }

  /** Collapses or expands the list. */
  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}
