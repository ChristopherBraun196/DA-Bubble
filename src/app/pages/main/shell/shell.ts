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
/**
 * Workspace frame holding the sidebar, the main view and the thread panel.
 *
 * @remarks
 * Owns which of the three main views is visible — chat, direct message or the
 * new-message form — and opens the chat subscription for the signed-in user.
 */
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
  /** The thread panel is hidden while composing a new message. */
  protected readonly threadVisible = computed(() => !!this.thread.target() && !this.composing());

  constructor() {
    const user = this.auth.currentUser();

    if (user) {
      void this.chats.connect(user.uid);
    }

    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /** Collapses or expands the sidebar. */
  protected toggleDevspace(): void {
    this.devspaceOpen.update((value) => !value);
  }

  /** Closes the thread panel. */
  protected closeThread(): void {
    this.thread.close();
  }

  /**
   * Switches between the chat view and the new-message form.
   *
   * @param composing - True to show the form.
   */
  protected showCompose(composing: boolean): void {
    this.composing.set(composing);
    if (composing) {
      this.thread.close();
    }
  }

  /**
   * Opens a direct conversation in the main view.
   *
   * @param user - The conversation partner, or `null` to leave the view.
   */
  protected showDirectMessage(user: DirectMessageUser | null): void {
    this.searchTarget.set(null);
    this.activeDirectUser.set(user);
    if (user) {
      this.thread.close();
    }
  }

  /**
   * Opens a direct conversation started from a member profile.
   *
   * @param user - The member to write to.
   */
  protected showMemberDirectMessage(user: AppUser): void {
    this.openDirectMessage({
      id: user.uid,
      name: user.displayName,
      avatar: user.photoURL,
      online: true,
    });
  }

  /**
   * Opens a direct conversation and mirrors the selection in the sidebar.
   *
   * @param user - The conversation partner.
   */
  protected openDirectMessage(user: DirectMessageUser): void {
    this.devspaceNav()?.selectUser(user);
  }

  /**
   * Jumps to a message picked from the search results.
   *
   * @param message - The selected search hit.
   */
  protected showSearchMessage(message: MessageSearchResult): void {
    this.showChannel(message.chatId);
    this.searchTarget.set(message);
  }

  /**
   * Opens a channel picked from the search results.
   *
   * @param channelId - Id of the channel to show.
   */
  protected showChannel(channelId: string): void {
    this.devspaceNav()?.selectChannel(channelId);
  }

  /** Releases all chat subscriptions when the workspace is left. */
  private disconnect(): void {
    this.chats.disconnect();
    this.thread.close();
  }
}
