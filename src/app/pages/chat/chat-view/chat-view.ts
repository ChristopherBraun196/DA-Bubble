import { MessageSearchResult } from '../../../core/models/message-search.model';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { MessageService } from '../../../core/services/message.service';
import { ThreadService } from '../../../core/services/thread.service';
import { ChatHeader } from '../chat-header/chat-header';
import { MessageInput } from '../message-input/message-input';
import { MessageEdit, MessageList, MessageReactionToggle } from '../message-list/message-list';

@Component({
  imports: [ChatHeader, MessageInput, MessageList],
  selector: 'app-chat-view',
  styleUrl: './chat-view.scss',
  templateUrl: './chat-view.html',
})
export class ChatView {
  readonly searchTarget = input<MessageSearchResult | null>(null);
  readonly directMessageRequested = output<AppUser>();

  protected readonly auth = inject(AuthService);
  protected readonly chats = inject(ChatService);
  protected readonly messages = inject(MessageService);
  private readonly thread = inject(ThreadService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeChat = computed(() =>
    this.chats.chats().find(({ id }) => id === this.chats.activeChatId()),
  );
  protected readonly placeholder = computed(() =>
    this.activeChat() ? `Nachricht an #${this.activeChat()?.name}` : 'Nachricht schreiben',
  );
  protected readonly sending = signal(false);
  protected readonly activeSearchTarget = computed(() =>
    this.searchTarget()?.chatId === this.chats.activeChatId() ? this.searchTarget() : null,
  );

  constructor() {
    effect(() => {
      const chatId = this.chats.activeChatId();

      if (chatId) {
        this.messages.connect(chatId, this.activeSearchTarget()?.createdAt ?? null);
      } else {
        this.messages.disconnect();
      }

      this.closeForeignThread(chatId);
    });

    this.destroyRef.onDestroy(() => this.messages.disconnect());
  }

  protected async sendMessage(text: string): Promise<void> {
    const chatId = this.chats.activeChatId();
    if (!chatId || this.sending()) {
      return;
    }
    this.sending.set(true);
    try {
      await this.messages.sendMessage(chatId, text);
    } finally {
      this.sending.set(false);
    }
  }

  protected async editMessage({ id, text }: MessageEdit): Promise<void> {
    const chatId = this.chats.activeChatId();

    if (!chatId) {
      return;
    }

    await this.messages.updateMessage(chatId, id, text);
  }

  protected openThread(messageId: string): void {
    const chatId = this.chats.activeChatId();
    if (chatId) {
      this.thread.open(chatId, messageId);
    }
  }

  private closeForeignThread(chatId: string | null): void {
    const target = untracked(() => this.thread.target());
    if (target && target.chatId !== chatId) {
      this.thread.close();
    }
  }

  protected async toggleReaction({ id, emoji }: MessageReactionToggle): Promise<void> {
    const chatId = this.chats.activeChatId();
    if (!chatId) {
      return;
    }
    await this.messages.toggleReaction(chatId, id, emoji);
  }
}
