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
export class DirectMessageView {
  protected readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
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

  private prepareConversation(): void {
    this.messages.disconnect();
    this.chatId.set(null);
    this.loadingChat.set(true);
    this.actionError.set('');
    this.closeProfile();
  }

  private async connectConversation(
    userId: string,
    otherUserId: string,
    version: number,
  ): Promise<void> {
    try {
      const chatId = await this.chats.ensureDirectChat(userId, otherUserId);
      if (version !== this.connectionVersion) return;
      this.chatId.set(chatId);
      this.messages.connect(chatId);
      requestAnimationFrame(() => this.messageInput()?.focus());
    } catch {
      this.showConnectionError(version);
    } finally {
      if (version === this.connectionVersion) this.loadingChat.set(false);
    }
  }

  private showConnectionError(version: number): void {
    if (version !== this.connectionVersion) return;
    this.loadingChat.set(false);
    this.actionError.set('Die Direktnachricht konnte nicht geöffnet werden.');
  }

  protected async sendMessage(text: string): Promise<void> {
    const chatId = this.chatId();
    if (!chatId || this.sending()) return;
    this.sending.set(true);
    this.actionError.set('');
    try {
      await this.messages.sendMessage(chatId, text);
    } catch {
      this.actionError.set('Die Nachricht konnte nicht gesendet werden.');
    } finally {
      this.sending.set(false);
    }
  }

  protected async editMessage({ id, text }: MessageEdit): Promise<void> {
    const chatId = this.chatId();
    if (!chatId) return;
    try {
      await this.messages.updateMessage(chatId, id, text);
    } catch {
      this.actionError.set('Die Nachricht konnte nicht bearbeitet werden.');
    }
  }

  protected async toggleReaction({ id, emoji }: MessageReactionToggle): Promise<void> {
    const chatId = this.chatId();
    if (!chatId) return;
    try {
      await this.messages.toggleReaction(chatId, id, emoji);
    } catch {
      this.actionError.set('Die Reaktion konnte nicht gespeichert werden.');
    }
  }

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

  private showProfile(profile: AppUser | null): void {
    this.profileUser.set(profile);
    this.profileOpen.set(true);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
    this.profileUser.set(null);
  }

  private disconnect(): void {
    this.connectionVersion++;
    this.messages.disconnect();
  }
}
