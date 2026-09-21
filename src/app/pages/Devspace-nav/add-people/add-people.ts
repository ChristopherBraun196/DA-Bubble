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

  protected setMode(mode: AddPeopleMode): void {
    this.mode.set(mode);
    this.addError.set('');
  }

  protected updateSearchTerm(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    void this.search(term);
  }

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

  private withoutSelected(matches: UserSearchResult[]): UserSearchResult[] {
    const selectedIds = new Set(this.selected().map(({ uid }) => uid));
    return matches.filter(({ uid }) => !selectedIds.has(uid));
  }

  protected selectPerson(person: UserSearchResult): void {
    this.selected.update((people) => [...people, person]);
    this.searchTerm.set('');
    this.suggestions.set([]);
    this.addError.set('');
  }

  protected removePerson(uid: string): void {
    this.selected.update((people) => people.filter((person) => person.uid !== uid));
  }

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

  private memberIdsToAdd(): string[] {
    return this.mode() === 'all' ? this.sourceMemberIds() : this.selected().map(({ uid }) => uid);
  }
}
