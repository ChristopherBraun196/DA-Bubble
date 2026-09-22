import { MessageSearchResult } from '../../../core/models/message-search.model';
import { Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { AppUser } from '../../../core/models/user.model';
import { ChatService } from '../../../core/services/chat.service';
import { ThreadService } from '../../../core/services/thread.service';
import { ChatView } from '../../chat/chat-view/chat-view';
import { DevspaceNav } from '../../Devspace-nav/devspace-nav/devspace-nav';
import { ThreadPanel } from '../../thread/thread-panel/thread-panel';
import { Topbar } from '../topbar/topbar';
import { NewMessage } from '../../chat/new-message/new-message';
import { DirectMessageView } from '../../chat/direct-message-view/direct-message-view';
import { DirectMessageUser } from '../../Devspace-nav/direct-message-list/direct-message-list';

@Component({
  imports: [Topbar, DevspaceNav, ChatView, ThreadPanel, NewMessage, DirectMessageView],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly thread = inject(ThreadService);
  protected readonly devspaceOpen = signal(true);
  protected readonly searchTarget = signal<MessageSearchResult | null>(null);
  protected readonly composing = signal(false);
  protected readonly activeDirectUser = signal<DirectMessageUser | null>(null);
  protected readonly devspaceNav = viewChild(DevspaceNav);
  protected readonly threadVisible = computed(
    () => !!this.thread.target() && !this.composing() && !this.activeDirectUser(),
  );

  constructor() {
    const user = this.auth.currentUser();

    if (user) {
      void this.chats.connect(user.uid);
    }

    this.destroyRef.onDestroy(() => this.disconnect());
  }

  protected toggleDevspace(): void {
    this.devspaceOpen.update((value) => !value);
  }

  protected closeThread(): void {
    this.thread.close();
  }

  protected showCompose(composing: boolean): void {
    this.composing.set(composing);
    if (composing) {
      this.thread.close();
    }
  }

  protected showDirectMessage(user: DirectMessageUser | null): void {
    this.searchTarget.set(null);
    this.activeDirectUser.set(user);
    if (user) {
      this.thread.close();
    }
  }

  protected showMemberDirectMessage(user: AppUser): void {
    this.devspaceNav()?.selectUser({
      id: user.uid,
      name: user.displayName,
      avatar: user.photoURL,
      online: true,
    });
  }

  protected showSearchMessage(message: MessageSearchResult): void {
    this.showChannel(message.chatId);
    this.searchTarget.set(message);
  }

  protected showChannel(channelId: string): void {
    this.devspaceNav()?.selectChannel(channelId);
  }

  private disconnect(): void {
    this.chats.disconnect();
    this.thread.close();
  }
}
