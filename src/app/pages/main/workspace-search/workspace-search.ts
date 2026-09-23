import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AppUser, UserSearchResult } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';
import { MentionDropdown, MentionEntry } from '../../../shared/mention-dropdown/mention-dropdown';
import { MessageSearchService } from '../../../core/services/message-search.service';
import { MessageSearchResult } from '../../../core/models/message-search.model';
import { ProfileDialog } from '../profile-dialog/profile-dialog';

@Component({
  selector: 'app-workspace-search',
  providers: [MessageSearchService],
  imports: [MentionDropdown, ProfileDialog],
  templateUrl: './workspace-search.html',
  styleUrl: './workspace-search.scss',
})
/**
 * Search field covering messages, channels and members.
 *
 * @remarks
 * A leading `#` narrows the search to channels and `@` to members; without a
 * prefix all three kinds are offered. Results are rendered by the shared
 * {@link MentionDropdown}.
 */
export class WorkspaceSearch {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly chats = inject(ChatService);
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly members = signal<UserSearchResult[]>([]);
  protected readonly messageSearch = inject(MessageSearchService);
  private usersLoaded = false;
  private selectionVersion = 0;

  readonly channelSelected = output<string>();
  readonly messageSelected = output<MessageSearchResult>();
  readonly directMessageRequested = output<AppUser>();
  protected readonly query = signal('');
  protected readonly opened = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly profile = signal<AppUser | null>(null);
  protected readonly dropdown = viewChild(MentionDropdown);
  protected readonly field = viewChild<ElementRef<HTMLInputElement>>('searchField');
  /** The query without its `#` or `@` prefix. */
  protected readonly search = computed(() => this.query().trim().replace(/^[#@]/, ''));
  /** The rows currently offered in the dropdown. */
  protected readonly entries = computed(() => this.createEntries());

  private readonly searchableIds = computed(() =>
    this.chats
      .chats()
      .filter(
        (chat) =>
          chat.type === 'channel' && chat.memberIds?.includes(this.auth.currentUser()?.uid || ''),
      )
      .map((chat) => chat.id)
      .sort()
      .join(','),
  );
  private readonly searchingMessages = computed(
    () => this.opened() && Boolean(this.query().trim()) && !/^[#@]/.test(this.query().trim()),
  );

  constructor() {
    effect(() => {
      const ids = this.searchableIds();
      if (this.searchingMessages()) this.messageSearch.connect(ids ? ids.split(',') : []);
      else this.messageSearch.disconnect();
    });
  }

  /**
   * Assembles the result rows according to the active prefix.
   *
   * @returns Channels, members and messages in the order they are shown.
   */
  private createEntries(): MentionEntry[] {
    const query = this.query().trim();
    const channels = this.chats
      .chats()
      .filter((chat) => chat.type === 'channel')
      .map((chat) => ({ id: `channel:${chat.id}`, label: chat.name, icon: '#' }));
    const members = this.members().map((user) => this.memberEntry(user));
    if (query.startsWith('#')) return channels;
    if (query.startsWith('@')) return members;
    return [...channels, ...members, ...this.messageEntries()];
  }

  /** Maps the matching messages into dropdown rows. */
  private messageEntries(): MentionEntry[] {
    const term = this.search().toLowerCase();
    return this.messageSearch
      .messages()
      .filter((message) => message.text.toLowerCase().includes(term))
      .map((message) => this.messageEntry(message));
  }

  /**
   * Maps one search hit into a dropdown row.
   *
   * @param message - The message that matched.
   * @returns The row, carrying author and excerpt.
   */
  private messageEntry(message: MessageSearchResult): MentionEntry {
    const channel = this.chats.chats().find((chat) => chat.id === message.chatId);
    return {
      id: `message:${message.chatId}/${message.messageId}`,
      icon: '↳',
      label: this.messageExcerpt(message.text),
      searchText: message.text,
      description: `${message.authorName} · #${channel?.name || ''} · ${message.createdAt.toDate().toLocaleDateString('de-DE')}`,
    };
  }

  /**
   * Shortens a message body for the result list.
   *
   * @param text - The full message text.
   * @returns A single-line excerpt.
   */
  private messageExcerpt(text: string): string {
    const position = text.toLowerCase().indexOf(this.search().toLowerCase());
    const start = Math.max(0, position - 35);
    const end = Math.min(text.length, Math.max(start + 120, position + this.search().length));
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }

  /**
   * Maps a user into a dropdown row.
   *
   * @param user - The matching user.
   * @returns The row, carrying name and avatar.
   */
  private memberEntry(user: UserSearchResult): MentionEntry {
    const suffix = user.uid === this.auth.currentUser()?.uid ? ' (Du)' : '';
    return { id: `user:${user.uid}`, label: user.displayName + suffix, avatar: user.photoURL };
  }

  /**
   * Tracks what is typed into the search field.
   *
   * @param event - The input event of the text field.
   */
  protected updateQuery(event: Event): void {
    this.selectionVersion++;
    this.query.set((event.target as HTMLInputElement).value);
    this.error.set('');
    this.openSearch();
  }

  /** Opens the result list, for example when the field gains focus. */
  protected openSearch(): void {
    this.opened.set(Boolean(this.query().trim()));
    if (this.opened() && !this.query().trim().startsWith('#')) void this.loadMembers();
  }

  /** Handles a click on the search icon by focusing the field. */
  protected searchClicked(): void {
    this.field()?.nativeElement.focus();
    this.openSearch();
  }

  /** Loads the searchable members once, on first use. */
  private async loadMembers(): Promise<void> {
    if (this.usersLoaded || this.loading()) return;
    this.loading.set(true);
    try {
      this.members.set(await this.users.getAllUsers());
      this.usersLoaded = true;
    } catch {
      this.error.set('Mitglieder konnten nicht geladen werden. Bitte erneut versuchen.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Acts on the selected row — opens a channel, a profile or a message.
   *
   * @param entry - The row the user picked.
   */
  protected selectEntry(entry: MentionEntry): void {
    if (entry.id.startsWith('message:')) {
      this.selectMessage(entry.id);
      return;
    }
    this.opened.set(false);
    if (entry.id.startsWith('channel:')) {
      this.query.set('');
      this.channelSelected.emit(entry.id.slice(8));
      return;
    }
    void this.openProfile(entry.id.slice(5), ++this.selectionVersion);
  }

  /**
   * Reports the chosen message so the workspace can scroll to it.
   *
   * @param id - Id of the message that was picked.
   */
  private selectMessage(id: string): void {
    const message = this.messageSearch
      .messages()
      .find((item) => `message:${item.chatId}/${item.messageId}` === id);
    if (!message) return;
    this.messageSelected.emit(message);
    this.query.set('');
    this.close();
  }

  /**
   * Loads and shows a member's profile.
   *
   * @param uid - Id of the member to display.
   * @param version - Guards against a selection changed in the meantime.
   */
  private async openProfile(uid: string, version: number): Promise<void> {
    try {
      const profile = await this.users.getProfile(uid);
      if (version !== this.selectionVersion) return;
      if (!profile) throw new Error('Profile missing');
      this.profile.set(profile);
      this.query.set('');
    } catch {
      if (version !== this.selectionVersion) return;
      this.error.set('Das Profil konnte nicht geladen werden. Bitte erneut versuchen.');
      this.opened.set(true);
    }
  }

  /**
   * Starts a direct conversation from a profile shown in the results.
   *
   * @param user - The member to write to.
   */
  protected openDirectMessage(user: AppUser): void {
    this.profile.set(null);
    this.directMessageRequested.emit(user);
  }

  /**
   * Forwards arrow and enter keys to the dropdown and closes on escape.
   *
   * @param event - The keyboard event of the search field.
   */
  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (this.opened()) this.dropdown()?.handleKeydown(event);
  }

  /** Closes the result list and clears any open profile. */
  protected close(): void {
    this.selectionVersion++;
    this.opened.set(false);
    this.profile.set(null);
  }

  @HostListener('document:click', ['$event'])
  /** Closes the result list on a click outside the component. */
  protected closeOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('focusout', ['$event'])
  /** Closes the result list once focus leaves the component. */
  protected closeOnBlur(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node)) this.opened.set(false);
  }
}
