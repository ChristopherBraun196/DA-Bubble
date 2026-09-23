import { Component, inject, signal, output } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';
import { ChannelList } from '../channel-list/channel-list';
import { DirectMessageList, DirectMessageUser } from '../direct-message-list/direct-message-list';

/** Was gerade im Chat offen ist: entweder ein Channel oder eine Direktnachricht. */
export type DevspaceSelection = { kind: 'channel'; id: string } | { kind: 'user'; id: string };

@Component({
  imports: [ChannelList, DirectMessageList],
  selector: 'app-devspace-nav',
  styleUrl: './devspace-nav.scss',
  templateUrl: './devspace-nav.html',
})
/** Sidebar listing the user's channels and direct message conversations. */
export class DevspaceNav {
  private readonly chats = inject(ChatService);

  readonly composingChanged = output<boolean>();
  readonly directMessageSelected = output<DirectMessageUser | null>();

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
  }

  /** Opens the new-message form and clears the sidebar selection. */
  protected startCompose(): void {
    this.temporaryUser.set(null);
    this.selection.set(null);
    this.directMessageSelected.emit(null);
    this.composingChanged.emit(true);
  }
}
