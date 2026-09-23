import { Component, computed, inject, output, signal, viewChild } from '@angular/core';

import { UserSearchResult } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { MessageService } from '../../../core/services/message.service';
import { UserService } from '../../../core/services/user.service';
import { MentionDropdown, MentionEntry } from '../../../shared/mention-dropdown/mention-dropdown';
import { DirectMessageUser } from '../../Devspace-nav/direct-message-list/direct-message-list';
import { MessageInput } from '../message-input/message-input';

@Component({
  imports: [MessageInput, MentionDropdown],
  selector: 'app-new-message',
  styleUrl: './new-message.scss',
  templateUrl: './new-message.html',
})
/**
 * Form for starting a conversation without picking a chat first.
 *
 * @remarks
 * The address field accepts `#` for channels and `@` for people; the chosen
 * recipient decides whether the message goes into a channel or opens a
 * direct conversation.
 */
export class NewMessage {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly messages = inject(MessageService);
  private readonly users = inject(UserService);
  private loadingUsers = false;

  protected readonly recipient = signal('');
  protected readonly mentionOpen = signal(false);
  protected readonly userEntries = signal<MentionEntry[]>([]);
  protected readonly selectedChannelId = signal<string | null>(null);
  protected readonly selectedDirectUser = signal<DirectMessageUser | null>(null);
  protected readonly sending = signal(false);
  protected readonly mentionDropdown = viewChild(MentionDropdown);
  readonly channelSelected = output<string>();
  readonly directMessageSelected = output<DirectMessageUser>();

  protected readonly channelEntries = computed<MentionEntry[]>(() =>
    this.chats
      .chats()
      .filter(({ type }) => type === 'channel')
      .map(({ id, name }) => ({ id: `channel:${id}`, label: name, icon: '#' })),
  );

  /**
   * Tracks the address field and opens the matching dropdown.
   *
   * @param event - The input event of the text field.
   */
  protected updateRecipient(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.recipient.set(value);
    this.selectedChannelId.set(null);
    this.selectedDirectUser.set(null);
    this.mentionOpen.set(Boolean(value.trim()));

    if (!value.trim().startsWith('#') && this.userEntries().length === 0) {
      void this.loadUsers();
    }
  }

  /**
   * Applies the chosen recipient.
   *
   * @param entry - The selected dropdown row.
   */
  protected selectRecipient(entry: MentionEntry): void {
    this.mentionOpen.set(false);
    if (entry.id.startsWith('channel:')) {
      this.selectChannel(entry);
      return;
    }
    this.selectUser(entry);
  }

  /** Remembers a channel as the recipient. */
  private selectChannel(entry: MentionEntry): void {
    this.recipient.set(`#${entry.label}`);
    this.selectedChannelId.set(entry.id.slice(8));
    this.selectedDirectUser.set(null);
  }

  /** Remembers a person as the recipient. */
  private selectUser(entry: MentionEntry): void {
    this.recipient.set(`@${entry.label}`);
    this.selectedChannelId.set(null);
    this.selectedDirectUser.set(this.toDirectMessageUser(entry));
  }

  /**
   * Sends the message to whichever recipient was chosen.
   *
   * @param text - The message body.
   */
  protected async sendMessage(text: string): Promise<void> {
    const channelId = this.selectedChannelId();
    const directUser = this.selectedDirectUser();
    if ((!channelId && !directUser) || this.sending()) return;
    this.sending.set(true);
    try {
      if (channelId) await this.sendChannelMessage(channelId, text);
      if (directUser) await this.sendDirectMessage(directUser, text);
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * Sends into a channel and opens it.
   *
   * @param channelId - Id of the target channel.
   * @param text - The message body.
   */
  private async sendChannelMessage(channelId: string, text: string): Promise<void> {
    await this.messages.sendMessage(channelId, text);
    this.channelSelected.emit(channelId);
  }

  /**
   * Sends a direct message, creating the conversation when needed.
   *
   * @param user - The recipient.
   * @param text - The message body.
   */
  private async sendDirectMessage(user: DirectMessageUser, text: string): Promise<void> {
    const currentUser = this.auth.currentUser();
    if (!currentUser) return;
    const chatId = await this.chats.ensureDirectChat(currentUser.uid, user.id);
    await this.messages.sendMessage(chatId, text);
    this.directMessageSelected.emit(user);
  }

  protected readonly mentionSearch = computed(() => this.recipient().trim().replace(/^[#@]/, ''));

  protected readonly mentionEntries = computed(() => {
    const recipient = this.recipient().trim();
    if (recipient.startsWith('#')) return this.channelEntries();
    if (recipient.startsWith('@')) return this.userEntries();
    return [...this.channelEntries(), ...this.userEntries()];
  });

  /** Loads the selectable people once, on the first `@`. */
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

  /**
   * Maps users into dropdown rows.
   *
   * @param users - The users to offer.
   * @returns The rows to render.
   */
  private toMentionEntries(users: UserSearchResult[]): MentionEntry[] {
    return users.map(({ uid, displayName, photoURL }) => ({
      id: `user:${uid}`,
      label: displayName,
      avatar: photoURL,
    }));
  }

  /**
   * Maps a dropdown row back into a conversation partner.
   *
   * @param entry - The selected row.
   * @returns The recipient of the direct message.
   */
  private toDirectMessageUser(entry: MentionEntry): DirectMessageUser {
    const userId = entry.id.slice(5);
    const isCurrentUser = userId === this.auth.currentUser()?.uid;
    return {
      id: userId,
      name: `${entry.label}${isCurrentUser ? ' (Du)' : ''}`,
      avatar: entry.avatar || '/img/Profile_Guest.png',
      online: isCurrentUser,
      isCurrentUser,
    };
  }
}
