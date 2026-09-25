import { Component, inject, input, signal, output } from '@angular/core';
import { MessageSearchResult } from '../../../core/models/message-search.model';
import { AppUser } from '../../../core/models/user.model';
import { ChatService } from '../../../core/services/chat.service';
import { WorkspaceSearch } from '../../main/workspace-search/workspace-search';
import { ChannelList } from '../channel-list/channel-list';
import { DirectMessageList, DirectMessageUser } from '../direct-message-list/direct-message-list';

/** Was gerade im Chat offen ist: entweder ein Channel oder eine Direktnachricht. */
export type DevspaceSelection = { kind: 'channel'; id: string } | { kind: 'user'; id: string };

@Component({
  imports: [ChannelList, DirectMessageList, WorkspaceSearch],
  selector: 'app-devspace-nav',
  styleUrl: './devspace-nav.scss',
  templateUrl: './devspace-nav.html',
})
/** Sidebar listing the user's channels and direct message conversations. */
export class DevspaceNav {
  private readonly chats = inject(ChatService);

  /** True once the topbar is too narrow to carry the workspace search itself. */
  readonly searchVisible = input(false);

  readonly composingChanged = output<boolean>();
  readonly directMessageSelected = output<DirectMessageUser | null>();
  /** Fires whenever a row opens something in the main column. */
  readonly navigated = output<void>();

  /* Nur durchgereicht, solange die Suche hier statt in der Topbar sitzt. */
  readonly messageSelected = output<MessageSearchResult>();
  readonly channelSelected = output<string>();
  readonly directMessageRequested = output<AppUser>();

  protected readonly selection = signal<DevspaceSelection | null>({
    kind: 'channel',
    id: 'entwicklerteam',
  });
  protected readonly temporaryUser = signal<DirectMessageUser | null>(null);

  /** Id of the highlighted channel, or `null` while a person is selected. */
  protected activeChannelId(): string | null {
    const selection = this.selection();
    return selection?.kind === 'channel' ? this.chats.activeChatId() : null;
  }

  /** Id of the highlighted person, or `null` while a channel is selected. */
  protected activeUserId(): string | null {
    const selection = this.selection();
    return selection?.kind === 'user' ? selection.id : null;
  }

  /**
   * Opens a channel and clears any other selection.
   *
   * @param id - Id of the channel to show.
   */
  public selectChannel(id: string): void {
    this.temporaryUser.set(null);
    this.composingChanged.emit(false);
    this.directMessageSelected.emit(null);
    this.selection.set({ kind: 'channel', id });
    this.chats.selectChat(id);
    this.navigated.emit();
  }

  /**
   * Opens a direct conversation and clears any other selection.
   *
   * @param user - The conversation partner.
   */
  public selectUser(user: DirectMessageUser): void {
    this.temporaryUser.set(user);
    this.composingChanged.emit(false);
    this.directMessageSelected.emit(user);
    this.selection.set({ kind: 'user', id: user.id });
    this.navigated.emit();
  }

  /** Opens the new-message form and clears the sidebar selection. */
  protected startCompose(): void {
    this.temporaryUser.set(null);
    this.selection.set(null);
    this.directMessageSelected.emit(null);
    this.composingChanged.emit(true);
    this.navigated.emit();
  }
}
