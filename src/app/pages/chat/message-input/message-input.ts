import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { UserSearchResult } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';
import { MentionDropdown, MentionEntry } from '../../../shared/mention-dropdown/mention-dropdown';

const MESSAGE_EMOJIS = [
  '😀 😃 😄 😁 😆 😅 😂 🤣',
  '😊 😍 🥰 😘 😎 🤓 🤔 🙄',
  '😢 😭 😡 🥳 🤩 🤯 👍 👎',
  '👏 🙌 🙏 💪 ❤️ 🔥 ✅ 🚀',
].flatMap((group) => group.split(' '));
const MENTION_KEYS = ['ArrowDown', 'ArrowUp', 'Enter'];

@Component({
  imports: [MentionDropdown],
  selector: 'app-message-input',
  styleUrl: './message-input.scss',
  templateUrl: './message-input.html',
})
export class MessageInput {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly users = inject(UserService);
  private loadingUsers = false;

  readonly placeholder = input('Nachricht schreiben');
  readonly disabled = input(false);
  readonly messageSent = output<string>();
  readonly sendDisabled = input(false);

  protected readonly message = signal('');
  protected readonly emojiPickerOpen = signal(false);
  protected readonly mentionOpen = signal(false);
  protected readonly mentionSearch = signal('');
  protected readonly mentionStart = signal<number | null>(null);
  protected readonly channelOpen = signal(false);
  protected readonly channelSearch = signal('');
  protected readonly channelStart = signal<number | null>(null);
  protected readonly userEntries = signal<MentionEntry[]>([]);
  protected readonly channelEntries = computed<MentionEntry[]>(() =>
    this.chats
      .chats()
      .filter(({ type }) => type === 'channel')
      .map(({ id, name }) => ({ id, label: name, value: name, icon: '#' }))
      .sort((first, second) => first.label.localeCompare(second.label, 'de')),
  );
  protected readonly emojis = MESSAGE_EMOJIS;
  protected readonly messageField = viewChild<ElementRef<HTMLTextAreaElement>>('messageField');
  protected readonly mentionDropdown = viewChild(MentionDropdown);

  @HostListener('document:click', ['$event'])
  protected closePickersOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.emojiPickerOpen.set(false);
      this.closeSuggestionPickers();
    }
  }

  protected updateMessage(event: Event): void {
    const field = event.target as HTMLTextAreaElement;
    this.message.set(field.value);
    this.updateSuggestionState(field.value, field.selectionStart);
  }

  protected toggleEmojiPicker(): void {
    this.closeSuggestionPickers();
    this.emojiPickerOpen.update((open) => !open);
  }

  protected insertEmoji(emoji: string): void {
    const field = this.messageField()?.nativeElement;
    const start = field?.selectionStart ?? this.message().length;
    const end = field?.selectionEnd ?? start;
    this.message.update((text) => text.slice(0, start) + emoji + text.slice(end));
    this.emojiPickerOpen.set(false);
    this.closeSuggestionPickers();
    this.restoreCursor(field, start + emoji.length);
  }

  protected openMentionPicker(): void {
    const field = this.messageField()?.nativeElement;
    if (!field) {
      return;
    }
    const start = field.selectionStart;
    const marker = start > 0 && !/\s/.test(this.message()[start - 1]) ? ' @' : '@';
    this.replaceText(start, field.selectionEnd, marker);
    this.mentionStart.set(start + marker.length - 1);
    this.openMention('');
    this.restoreCursor(field, start + marker.length);
  }

  protected selectMention(entry: MentionEntry): void {
    const field = this.messageField()?.nativeElement;
    const start = this.mentionStart();
    if (!field || start === null) {
      return;
    }
    const mention = `@${entry.value || entry.label} `;
    const cursor = this.replaceText(start, field.selectionStart, mention);
    this.closeMentionPicker();
    this.restoreCursor(field, cursor);
  }

  protected selectChannel(entry: MentionEntry): void {
    const field = this.messageField()?.nativeElement;
    const start = this.channelStart();
    if (!field || start === null) {
      return;
    }
    const channel = `#${entry.value || entry.label} `;
    const cursor = this.replaceText(start, field.selectionStart, channel);
    this.closeChannelPicker();
    this.restoreCursor(field, cursor);
  }

  private restoreCursor(field: HTMLTextAreaElement | undefined, position: number): void {
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(position, position);
    });
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (this.handleSuggestionKeydown(event)) {
      return;
    }
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    this.submitMessage();
  }

  protected submitMessage(): void {
    const message = this.message().trim();

    if (!message || this.disabled() || this.sendDisabled()) {
      return;
    }

    this.messageSent.emit(message);
    this.message.set('');
    this.emojiPickerOpen.set(false);
    this.closeSuggestionPickers();
  }

  private updateSuggestionState(text: string, cursor: number): void {
    const beforeCursor = text.slice(0, cursor);
    const mentionMatch = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (mentionMatch) {
      this.openTypedMention(beforeCursor, mentionMatch[1]);
      return;
    }
    const channelMatch = beforeCursor.match(/(?:^|\s)#([^\s#]*)$/);
    if (channelMatch) {
      this.openTypedChannel(beforeCursor, channelMatch[1]);
      return;
    }
    this.closeSuggestionPickers();
  }

  private openTypedMention(text: string, search: string): void {
    this.mentionStart.set(text.lastIndexOf('@'));
    this.openMention(search);
  }

  private openTypedChannel(text: string, search: string): void {
    this.channelStart.set(text.lastIndexOf('#'));
    this.channelSearch.set(search);
    this.channelOpen.set(true);
    this.closeMentionPicker();
    this.emojiPickerOpen.set(false);
  }

  private openMention(search: string): void {
    this.mentionSearch.set(search);
    this.mentionOpen.set(true);
    this.closeChannelPicker();
    this.emojiPickerOpen.set(false);
    void this.loadUsers();
  }

  private handleSuggestionKeydown(event: KeyboardEvent): boolean {
    if (!this.mentionOpen() && !this.channelOpen()) {
      return false;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSuggestionPickers();
      return true;
    }
    if (!event.shiftKey && MENTION_KEYS.includes(event.key)) {
      event.preventDefault();
      this.mentionDropdown()?.handleKeydown(event);
      return true;
    }
    return false;
  }

  private closeSuggestionPickers(): void {
    this.closeMentionPicker();
    this.closeChannelPicker();
  }

  private closeMentionPicker(): void {
    this.mentionOpen.set(false);
    this.mentionSearch.set('');
    this.mentionStart.set(null);
  }

  private closeChannelPicker(): void {
    this.channelOpen.set(false);
    this.channelSearch.set('');
    this.channelStart.set(null);
  }

  private replaceText(start: number, end: number, value: string): number {
    this.message.update((text) => text.slice(0, start) + value + text.slice(end));
    return start + value.length;
  }

  private async loadUsers(): Promise<void> {
    if (this.loadingUsers || this.userEntries().length) {
      return;
    }
    this.loadingUsers = true;
    try {
      this.userEntries.set(this.toMentionEntries(await this.users.getAllUsers()));
    } catch {
      this.userEntries.set([]);
    } finally {
      this.loadingUsers = false;
    }
  }

  private toMentionEntries(users: UserSearchResult[]): MentionEntry[] {
    const currentUserId = this.auth.currentUser()?.uid;
    return users
      .map(({ uid, displayName, photoURL }) => ({
        id: uid,
        label: uid === currentUserId ? `${displayName} (Du)` : displayName,
        value: displayName,
        avatar: photoURL,
      }))
      .sort(
        (first, second) => Number(second.id === currentUserId) - Number(first.id === currentUserId),
      );
  }
}
