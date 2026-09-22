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
  protected readonly search = computed(() => this.query().trim().replace(/^[#@]/, ''));
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

  private messageEntries(): MentionEntry[] {
    const term = this.search().toLowerCase();
    return this.messageSearch
      .messages()
      .filter((message) => message.text.toLowerCase().includes(term))
      .map((message) => this.messageEntry(message));
  }

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

  private messageExcerpt(text: string): string {
    const position = text.toLowerCase().indexOf(this.search().toLowerCase());
    const start = Math.max(0, position - 35);
    const end = Math.min(text.length, Math.max(start + 120, position + this.search().length));
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }

  private memberEntry(user: UserSearchResult): MentionEntry {
    const suffix = user.uid === this.auth.currentUser()?.uid ? ' (Du)' : '';
    return { id: `user:${user.uid}`, label: user.displayName + suffix, avatar: user.photoURL };
  }

  protected updateQuery(event: Event): void {
    this.selectionVersion++;
    this.query.set((event.target as HTMLInputElement).value);
    this.error.set('');
    this.openSearch();
  }

  protected openSearch(): void {
    this.opened.set(Boolean(this.query().trim()));
    if (this.opened() && !this.query().trim().startsWith('#')) void this.loadMembers();
  }

  protected searchClicked(): void {
    this.field()?.nativeElement.focus();
    this.openSearch();
  }

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

  private selectMessage(id: string): void {
    const message = this.messageSearch
      .messages()
      .find((item) => `message:${item.chatId}/${item.messageId}` === id);
    if (!message) return;
    this.messageSelected.emit(message);
    this.query.set('');
    this.close();
  }

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

  protected openDirectMessage(user: AppUser): void {
    this.profile.set(null);
    this.directMessageRequested.emit(user);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (this.opened()) this.dropdown()?.handleKeydown(event);
  }

  protected close(): void {
    this.selectionVersion++;
    this.opened.set(false);
    this.profile.set(null);
  }

  @HostListener('document:click', ['$event'])
  protected closeOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('focusout', ['$event'])
  protected closeOnBlur(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node)) this.opened.set(false);
  }
}
