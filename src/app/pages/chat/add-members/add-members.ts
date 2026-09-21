import { Component, computed, inject, input, output, signal } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';
const SEARCH_MIN_LENGTH = 3;

@Component({
  imports: [],
  selector: 'app-add-members',
  styleUrl: './add-members.scss',
  templateUrl: './add-members.html',
})
export class AddMembers {
  private readonly chats = inject(ChatService);
  private readonly users = inject(UserService);

  readonly channelName = input.required<string>();
  readonly closed = output<void>();

  private readonly activeChat = computed(() =>
    this.chats.chats().find(({ id }) => id === this.chats.activeChatId()),
  );

  protected readonly searchTerm = signal('');
  protected readonly suggestions = signal<UserSearchResult[]>([]);
  protected readonly selected = signal<UserSearchResult[]>([]);

  protected readonly adding = signal(false);
  protected readonly addError = signal('');

  private searchVersion = 0;

  protected readonly canAdd = computed(() => this.selected().length > 0);

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
      this.suggestions.set(this.withoutKnownPeople(matches));
    }
  }

  private withoutKnownPeople(matches: UserSearchResult[]): UserSearchResult[] {
    const knownIds = new Set([
      ...(this.activeChat()?.memberIds || []),
      ...this.selected().map(({ uid }) => uid),
    ]);

    return matches.filter(({ uid }) => !knownIds.has(uid));
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

  protected async add(): Promise<void> {
    const chatId = this.activeChat()?.id;

    if (!this.canAdd() || this.adding() || !chatId) {
      return;
    }

    this.adding.set(true);
    this.addError.set('');

    try {
      await this.chats.addMembers(
        chatId,
        this.selected().map(({ uid }) => uid),
      );
      this.closed.emit();
    } catch {
      this.addError.set('Die Mitglieder konnten nicht hinzugefügt werden. Versuch es noch einmal.');
    } finally {
      this.adding.set(false);
    }
  }
}
