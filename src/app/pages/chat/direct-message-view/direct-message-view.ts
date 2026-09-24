import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { MessageService } from '../../../core/services/message.service';
import { ThreadService } from '../../../core/services/thread.service';
import { UserService } from '../../../core/services/user.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { DirectMessageUser } from '../../Devspace-nav/direct-message-list/direct-message-list';
import { ProfileDialog } from '../../main/profile-dialog/profile-dialog';
import { MessageInput } from '../message-input/message-input';
import { MessageEdit, MessageList, MessageReactionToggle } from '../message-list/message-list';

@Component({
  imports: [MessageInput, MessageList, AvatarFallback, ProfileDialog],
  selector: 'app-direct-message-view',
  styleUrl: './direct-message-view.scss',
  templateUrl: './direct-message-view.html',
})
/**
 * Main view of a direct conversation.
 *
 * @remarks
 * Creates the underlying chat document lazily — a conversation only exists in
 * Firestore once the first message is sent.
 */
export class DirectMessageView {
  protected readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly thread = inject(ThreadService);
  private readonly users = inject(UserService);
  protected readonly messages = inject(MessageService);
  private connectionVersion = 0;

  readonly user = input.required<DirectMessageUser>();
  protected readonly messageInput = viewChild(MessageInput);
  protected readonly chatId = signal<string | null>(null);
  protected readonly loadingChat = signal(false);
  protected readonly actionError = signal('');
  protected readonly sending = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly profileUser = signal<AppUser | null>(null);

  protected readonly displayName = computed(() => this.user().name);
  protected readonly isCurrentUser = computed(() => this.user().isCurrentUser === true);
  protected readonly placeholder = computed(
    () => `Nachricht an ${this.displayName().replace(' (Du)', '')}`,
  );

  constructor() {
    effect(() => void this.openConversation(this.user().id));
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /**
   * Resolves and opens the conversation with a partner.
   *
   * @param otherUserId - Id of the conversation partner.
   */
  private async openConversation(otherUserId: string): Promise<void> {
    const version = ++this.connectionVersion;
    const currentUser = this.auth.currentUser();
    this.prepareConversation();
    if (!currentUser) {
      this.showConnectionError(version);
      return;
    }
    await this.connectConversation(currentUser.uid, otherUserId, version);
  }

  /** Resolves the chat id for the current partner and subscribes to it. */
  private prepareConversation(): void {
    this.messages.disconnect();
    this.chatId.set(null);
    this.loadingChat.set(true);
    this.actionError.set('');
    this.closeProfile();
  }

  /**
   * Subscribes to an existing conversation, if one has been created already.
   *
   * @param userId - The signed-in user.
   * @param otherUserId - The conversation partner.
   * @param version - Guards against a partner switched in the meantime.
   */
  private async connectConversation(
    userId: string,
    otherUserId: string,
    version: number,
  ): Promise<void> {
    try {
      const chatId = this.chats.getDirectChatId(userId, otherUserId);
      const chatExists = await this.chats.directChatExists(chatId);
      if (version !== this.connectionVersion) return;
      this.chatId.set(chatId);
      if (chatExists) this.messages.connect(chatId);
      requestAnimationFrame(() => this.messageInput()?.focus());
    } catch {
      this.showConnectionError(version);
    } finally {
      if (version === this.connectionVersion) this.loadingChat.set(false);
    }
  }

  /** Surfaces a failed connection unless the partner has meanwhile changed. */
  private showConnectionError(version: number): void {
    if (version !== this.connectionVersion) return;
    this.loadingChat.set(false);
    this.actionError.set('Die Direktnachricht konnte nicht geöffnet werden.');
  }

  /**
   * Sends a direct message, creating the conversation on first use.
   *
   * @param text - The message body.
   */
  protected async sendMessage(text: string): Promise<void> {
    const chatId = this.chatId();
    if (!chatId || this.sending()) return;
    const recipientId = this.user().id;
    this.sending.set(true);
    this.actionError.set('');
    try {
      await this.prepareDirectChat(chatId, recipientId);
      await this.messages.sendMessage(chatId, text);
    } catch {
      this.actionError.set('Die Nachricht konnte nicht gesendet werden.');
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * Creates the chat document and subscribes to it.
   *
   * @param chatId - Id the conversation will live under.
   * @param recipientId - The conversation partner.
   */
  private async prepareDirectChat(chatId: string, recipientId: string): Promise<void> {
    const currentUser = this.auth.currentUser();
    if (!currentUser) throw new Error('User missing');
    await this.chats.ensureDirectChat(currentUser.uid, recipientId);
    this.messages.connect(chatId);
  }

  /**
   * Stores an edited message body.
   *
   * @param edit - Id of the message and its new text.
   */
  protected async editMessage({ id, text }: MessageEdit): Promise<void> {
    const chatId = this.chatId();
    if (!chatId) return;
    try {
      await this.messages.updateMessage(chatId, id, text);
    } catch {
      this.actionError.set('Die Nachricht konnte nicht bearbeitet werden.');
    }
  }

  /** Opens the thread panel for a direct message. */
  protected openThread(messageId: string): void {
    const chatId = this.chatId();
    if (chatId) this.thread.open(chatId, messageId);
  }

  /**
   * Adds or removes a reaction on a message.
   *
   * @param toggle - Id of the message and the emoji to toggle.
   */
  protected async toggleReaction({ id, emoji }: MessageReactionToggle): Promise<void> {
    const chatId = this.chatId();
    if (!chatId) return;
    try {
      await this.messages.toggleReaction(chatId, id, emoji);
    } catch {
      this.actionError.set('Die Reaktion konnte nicht gespeichert werden.');
    }
  }

  /** Loads and shows the partner's profile. */
  protected async openProfile(): Promise<void> {
    if (this.isCurrentUser()) {
      this.showProfile(null);
      return;
    }
    try {
      const profile = await this.users.getProfile(this.user().id);
      if (profile) this.showProfile(profile);
    } catch {
      this.actionError.set('Das Profil konnte nicht geladen werden.');
    }
  }

  /**
   * Opens the partner's profile.
   *
   * @param profile - The loaded user, or `null` when unavailable.
   */
  private showProfile(profile: AppUser | null): void {
    this.profileUser.set(profile);
    this.profileOpen.set(true);
  }

  /** Closes the profile dialog. */
  protected closeProfile(): void {
    this.profileOpen.set(false);
    this.profileUser.set(null);
  }

  /** Releases the message subscription when the view is left. */
  private disconnect(): void {
    this.connectionVersion++;
    this.messages.disconnect();
  }
}
