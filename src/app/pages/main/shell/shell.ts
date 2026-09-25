import { MessageSearchResult } from '../../../core/models/message-search.model';
import { Component, computed, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { AppUser } from '../../../core/models/user.model';
import { ChatService } from '../../../core/services/chat.service';
import { ThreadService } from '../../../core/services/thread.service';
import { UserService } from '../../../core/services/user.service';
import { ChatView } from '../../chat/chat-view/chat-view';
import { DevspaceNav } from '../../Devspace-nav/devspace-nav/devspace-nav';
import { ThreadPanel } from '../../thread/thread-panel/thread-panel';
import { Topbar } from '../topbar/topbar';
import { NewMessage } from '../../chat/new-message/new-message';
import { DirectMessageView } from '../../chat/direct-message-view/direct-message-view';
import { DirectMessageUser } from '../../Devspace-nav/direct-message-list/direct-message-list';

/** Below this width the workspace shows a single column at a time. */
const COMPACT_VIEWPORT = '(max-width: 869px)';

/** The column that owns the screen while the workspace is compact. */
export type WorkspacePane = 'devspace' | 'chat' | 'thread';

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
  private readonly users = inject(UserService);
  private directRestoreVersion = 0;

  protected readonly thread = inject(ThreadService);
  protected readonly devspaceOpen = signal(true);
  protected readonly searchTarget = signal<MessageSearchResult | null>(null);
  protected readonly composing = signal(false);
  protected readonly activeDirectUser = signal<DirectMessageUser | null>(null);
  protected readonly devspaceNav = viewChild(DevspaceNav);
  protected readonly compact = signal(false);
  protected readonly pane = signal<WorkspacePane>('devspace');
  /** The thread panel is hidden while composing a new message. */
  protected readonly threadVisible = computed(() => !!this.thread.target() && !this.composing());
  /** Only a compact layout that left the sidebar behind needs a way back. */
  protected readonly backVisible = computed(() => this.compact() && this.pane() !== 'devspace');
  /** Compact screens hide the sidebar by pane, not by the collapse toggle. */
  protected readonly devspaceHidden = computed(() =>
    this.compact() ? this.pane() !== 'devspace' : !this.devspaceOpen(),
  );

  constructor() {
    const user = this.auth.currentUser();

    if (user) {
      void this.chats.connect(user.uid);
    }

    this.watchViewport();

    effect(() => {
      this.thread.openRequests();
      if (this.threadVisible()) this.pane.set('thread');
    });

    effect(() => {
      const activeChat = this.chats.chats().find(({ id }) => id === this.chats.activeChatId());
      const version = ++this.directRestoreVersion;
      if (activeChat?.type === 'direct' && !this.activeDirectUser()) {
        void this.restoreDirectMessage(activeChat.id, activeChat.memberIds, version);
      }
    });

    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /** Keeps {@link compact} in sync with the single-column breakpoint. */
  private watchViewport(): void {
    const query = window.matchMedia(COMPACT_VIEWPORT);
    const sync = () => this.compact.set(query.matches);

    sync();
    query.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', sync));
  }

  /** Restores a direct-message view selected during the initial chat load. */
  private async restoreDirectMessage(
    chatId: string,
    memberIds: string[],
    version: number,
  ): Promise<void> {
    const currentUserId = this.auth.currentUser()?.uid;
    if (!currentUserId) return;
    const partnerId = memberIds.find((id) => id !== currentUserId) || currentUserId;
    const user = await this.resolveDirectUser(partnerId, currentUserId);
    if (version !== this.directRestoreVersion || this.chats.activeChatId() !== chatId) return;
    const navigation = this.devspaceNav();
    if (navigation) navigation.selectUser(user);
    else this.showDirectMessage(user);
  }

  /** Resolves the sidebar row for a direct-message participant. */
  private async resolveDirectUser(
    userId: string,
    currentUserId: string,
  ): Promise<DirectMessageUser> {
    if (userId === currentUserId) return this.currentDirectUser(userId);
    try {
      const user = await this.users.findById(userId);
      return {
        id: userId,
        name: user?.displayName || 'Unbekannter Nutzer',
        avatar: user?.photoURL || '/img/Profile_Guest.png',
        online: false,
      };
    } catch {
      return this.unknownDirectUser(userId);
    }
  }

  /** Maps the signed-in user to a direct-message participant. */
  private currentDirectUser(userId: string): DirectMessageUser {
    return {
      id: userId,
      name: `${this.auth.displayName()} (Du)`,
      avatar: this.auth.photoURL(),
      online: true,
      isCurrentUser: true,
    };
  }

  /** Provides a usable direct-message view when a profile cannot be loaded. */
  private unknownDirectUser(userId: string): DirectMessageUser {
    return {
      id: userId,
      name: 'Unbekannter Nutzer',
      avatar: '/img/Profile_Guest.png',
      online: false,
    };
  }

  /** Collapses or expands the sidebar. */
  protected toggleDevspace(): void {
    this.devspaceOpen.update((value) => !value);
  }

  /** Closes the thread panel and hands the screen back to the chat. */
  protected closeThread(): void {
    this.thread.close();
    this.pane.set('chat');
  }

  /** Brings the main column forward after a sidebar row was picked. */
  protected showChatPane(): void {
    this.pane.set('chat');
  }

  /** Returns from the chat or thread column to the sidebar. */
  protected showDevspacePane(): void {
    this.pane.set('devspace');
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
