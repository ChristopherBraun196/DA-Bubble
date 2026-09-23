import { Component, computed, inject, input, output, signal } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';

export type AddPeopleMode = 'all' | 'specific';

const SEARCH_MIN_LENGTH = 3;

@Component({
  imports: [AvatarFallback],
  selector: 'app-add-people',
  styleUrl: './add-people.scss',
  templateUrl: './add-people.html',
})
/**
 * Invite step of the channel creation flow.
 *
 * @remarks
 * Either copies the members of the channel the dialog was opened from, or
 * lets the user pick people individually.
 */
export class AddPeople {
  private readonly chats = inject(ChatService);
  private readonly users = inject(UserService);

  readonly chatId = input.required<string>();
  readonly sourceChannelName = input('');
  readonly sourceMemberIds = input<string[]>([]);

  readonly closed = output<void>();

  protected readonly mode = signal<AddPeopleMode>('all');
  protected readonly searchTerm = signal('');
  protected readonly suggestions = signal<UserSearchResult[]>([]);
  protected readonly selected = signal<UserSearchResult[]>([]);

  protected readonly adding = signal(false);
  protected readonly addError = signal('');

  private searchVersion = 0;

  protected readonly canCreate = computed(
    () => this.mode() === 'all' || this.selected().length > 0,
  );

  /**
   * Switches between inviting everyone and picking individuals.
   *
   * @param mode - The chosen invite mode.
   */
  protected setMode(mode: AddPeopleMode): void {
    this.mode.set(mode);
    this.addError.set('');
  }

  /**
   * Tracks the search term used to find people.
   *
   * @param event - The input event of the search field.
   */
  protected updateSearchTerm(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    void this.search(term);
  }

  /**
   * Looks up people matching the search term.
   *
   * @param term - The typed term; shorter input clears the suggestions.
   *
   * @remarks
   * A version counter discards results of a search the user has since
   * typed past.
   */
  private async search(term: string): Promise<void> {
    const version = ++this.searchVersion;

    if (term.trim().length < SEARCH_MIN_LENGTH) {
      this.suggestions.set([]);
      return;
    }

    const matches = await this.users.searchByName(term);

    if (version === this.searchVersion) {
      this.suggestions.set(this.withoutSelected(matches));
    }
  }

  /**
   * Hides already chosen people from the suggestions.
   *
   * @param matches - The search results.
   * @returns The results minus everyone already selected.
   */
  private withoutSelected(matches: UserSearchResult[]): UserSearchResult[] {
    const selectedIds = new Set(this.selected().map(({ uid }) => uid));
    return matches.filter(({ uid }) => !selectedIds.has(uid));
  }

  /**
   * Adds a person to the selection.
   *
   * @param person - The user picked from the suggestions.
   */
  protected selectPerson(person: UserSearchResult): void {
    this.selected.update((people) => [...people, person]);
    this.searchTerm.set('');
    this.suggestions.set([]);
    this.addError.set('');
  }

  /**
   * Removes a person from the selection.
   *
   * @param uid - Id of the user to drop.
   */
  protected removePerson(uid: string): void {
    this.selected.update((people) => people.filter((person) => person.uid !== uid));
  }

  /** Adds the selected people to the channel and closes the dialog. */
  protected async create(): Promise<void> {
    if (!this.canCreate() || this.adding()) {
      return;
    }

    this.adding.set(true);
    this.addError.set('');

    try {
      await this.chats.addMembers(this.chatId(), this.memberIdsToAdd());
      this.closed.emit();
    } catch {
      this.addError.set('Die Mitglieder konnten nicht hinzugefügt werden. Versuch es noch einmal.');
    } finally {
      this.adding.set(false);
    }
  }

  /**
   * Resolves which user ids to write, depending on the invite mode.
   *
   * @returns The member ids to add to the channel.
   */
  private memberIdsToAdd(): string[] {
    return this.mode() === 'all' ? this.sourceMemberIds() : this.selected().map(({ uid }) => uid);
  }
}
