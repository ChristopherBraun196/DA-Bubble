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
  viewChild,
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
/**
 * Main view of a channel: header, message list and input.
 *
 * @remarks
 * Follows the active chat and rewires the message subscription whenever it
 * changes. It waits for the chat to show up in the chat list first: a freshly
 * created channel is made active before its document has reached the list
 * snapshot, and subscribing that early makes the security rules reject the
 * read.
 */
export class ChatView {
  readonly searchTarget = input<MessageSearchResult | null>(null);
  readonly directMessageRequested = output<AppUser>();

  protected readonly auth = inject(AuthService);
  protected readonly chats = inject(ChatService);
  protected readonly messages = inject(MessageService);
  private readonly thread = inject(ThreadService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageInput = viewChild(MessageInput);

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
      const chat = this.activeChat();

      if (chat) {
        this.messages.connect(chat.id, this.activeSearchTarget()?.createdAt ?? null);
      } else {
        this.messages.disconnect();
      }

      this.closeForeignThread(this.chats.activeChatId());
    });

    this.focusActiveChannel();
    this.destroyRef.onDestroy(() => this.messages.disconnect());
  }

  /** Moves the cursor into the input whenever another channel is opened. */
  private focusActiveChannel(): void {
    effect(() => {
      const chatId = this.chats.activeChatId();
      if (!chatId) return;
      requestAnimationFrame(() => {
        if (this.chats.activeChatId() === chatId) this.messageInput()?.focus();
      });
    });
  }

  /**
   * Sends a message into the open chat.
   *
   * @param text - The message body.
   */
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

  /**
   * Stores an edited message body.
   *
   * @param edit - Id of the message and its new text.
   */
  protected async editMessage({ id, text }: MessageEdit): Promise<void> {
    const chatId = this.chats.activeChatId();

    if (!chatId) {
      return;
    }

    await this.messages.updateMessage(chatId, id, text);
  }

  /**
   * Opens the thread panel for a message.
   *
   * @param messageId - Id of the message the thread hangs off.
   */
  protected openThread(messageId: string): void {
    const chatId = this.chats.activeChatId();
    if (chatId) {
      this.thread.open(chatId, messageId);
    }
  }

  /** Closes a thread that belongs to a chat the user has just left. */
  private closeForeignThread(chatId: string | null): void {
    const target = untracked(() => this.thread.target());
    if (target && target.chatId !== chatId) {
      this.thread.close();
    }
  }

  /**
   * Adds or removes a reaction on a message.
   *
   * @param toggle - Id of the message and the emoji to toggle.
   */
  protected async toggleReaction({ id, emoji }: MessageReactionToggle): Promise<void> {
    const chatId = this.chats.activeChatId();
    if (!chatId) {
      return;
    }
    await this.messages.toggleReaction(chatId, id, emoji);
  }
}
