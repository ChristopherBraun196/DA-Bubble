import { Component, computed, inject, output, signal, viewChild } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { ChatService } from '../../../core/services/chat.service';
import { MessageService } from '../../../core/services/message.service';
import { UserService } from '../../../core/services/user.service';
import { MentionDropdown, MentionEntry } from '../../../shared/mention-dropdown/mention-dropdown';
import { MessageInput } from '../message-input/message-input';

@Component({
  imports: [MessageInput, MentionDropdown],
  selector: 'app-new-message',
  styleUrl: './new-message.scss',
  templateUrl: './new-message.html',
})
export class NewMessage {
  private readonly chats = inject(ChatService);
  private readonly messages = inject(MessageService);
  private readonly users = inject(UserService);
  private loadingUsers = false;

  // TODO: Empfaenger und Chat anlegen.
  protected readonly recipient = signal('');
  protected readonly mentionOpen = signal(false);
  protected readonly userEntries = signal<MentionEntry[]>([]);
  protected readonly selectedChannelId = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly mentionDropdown = viewChild(MentionDropdown);
  readonly channelSelected = output<string>();

  protected readonly channelEntries = computed<MentionEntry[]>(() =>
    this.chats
      .chats()
      .filter(({ type }) => type === 'channel')
      .map(({ id, name }) => ({ id, label: name })),
  );

  protected updateRecipient(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.recipient.set(value);
    this.selectedChannelId.set(null);
    this.mentionOpen.set(value.startsWith('#') || value.startsWith('@'));

    if (value.startsWith('@') && this.userEntries().length === 0) {
      void this.loadUsers();
    }
  }

  protected selectRecipient(entry: MentionEntry): void {
    const isChannel = this.recipient().startsWith('#');
    const prefix = isChannel ? '#' : '@';
    this.recipient.set(`${prefix}${entry.label}`);
    this.selectedChannelId.set(isChannel ? entry.id : null);
    this.mentionOpen.set(false);
  }

  protected async sendMessage(text: string): Promise<void> {
    const channelId = this.selectedChannelId();
    if (!channelId || this.sending()) {
      return;
    }
    this.sending.set(true);
    try {
      await this.messages.sendMessage(channelId, text);
      this.channelSelected.emit(channelId);
    } finally {
      this.sending.set(false);
    }
  }

  /** Was nach dem # oder @ getippt wurde - ohne Praefix gibt es nichts zu suchen. */
  protected readonly mentionSearch = computed(() => {
    const value = this.recipient();

    return value.startsWith('#') || value.startsWith('@') ? value.slice(1) : '';
  });

  /** # zeigt Channels, @ zeigt Personen. */
  protected readonly mentionEntries = computed(() =>
    this.recipient().startsWith('#') ? this.channelEntries() : this.userEntries(),
  );

  private async loadUsers(): Promise<void> {
    if (this.loadingUsers) {
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
    return users.map(({ uid, displayName, photoURL }) => ({
      id: uid,
      label: displayName,
      avatar: photoURL,
    }));
  }
}
