import { Component, computed, inject, output, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { MessageService } from '../../../core/services/message.service';
import { ThreadService } from '../../../core/services/thread.service';
import { MessageInput } from '../../chat/message-input/message-input';
import { MessageItem } from '../../chat/message-item/message-item';
import {
  MessageEdit,
  MessageList,
  MessageReactionToggle,
} from '../../chat/message-list/message-list';
import { ThreadHeader } from '../thread-header/thread-header';

@Component({
  imports: [ThreadHeader, MessageItem, MessageList, MessageInput],
  selector: 'app-thread-panel',
  styleUrl: './thread-panel.scss',
  templateUrl: './thread-panel.html',
})
export class ThreadPanel {
  readonly closed = output<void>();

  protected readonly auth = inject(AuthService);
  protected readonly thread = inject(ThreadService);
  private readonly chats = inject(ChatService);
  private readonly messages = inject(MessageService);

  protected readonly sending = signal(false);
  protected readonly currentUserId = computed(() => this.auth.currentUser()?.uid || null);
  protected readonly channelName = computed(
    () =>
      this.chats.chats().find(({ id }) => id === this.thread.target()?.chatId)?.name ||
      'Unbenannter Chat',
  );
  protected readonly replyLabel = computed(() => {
    const count = this.thread.replies().length;
    if (count === 0) {
      return 'Noch keine Antworten';
    }
    return count === 1 ? '1 Antwort' : `${count} Antworten`;
  });

  protected async sendReply(text: string): Promise<void> {
    const target = this.thread.target();
    if (!target || this.sending()) {
      return;
    }
    this.sending.set(true);
    try {
      await this.messages.sendReply(target.chatId, target.messageId, text);
    } finally {
      this.sending.set(false);
    }
  }

  protected async editMessage({ id, text }: MessageEdit): Promise<void> {
    const target = this.thread.target();
    if (target) {
      await this.messages.updateMessage(target.chatId, id, text);
    }
  }

  protected async toggleReaction({ id, emoji }: MessageReactionToggle): Promise<void> {
    const target = this.thread.target();
    if (target) {
      await this.messages.toggleReaction(target.chatId, id, emoji);
    }
  }
}
