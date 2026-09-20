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
export class DevspaceNav {
  private readonly chats = inject(ChatService);

  readonly composingChanged = output<boolean>();
  readonly directMessageSelected = output<DirectMessageUser | null>();

  protected readonly selection = signal<DevspaceSelection | null>({
    kind: 'channel',
    id: 'entwicklerteam',
  });

  protected activeChannelId(): string | null {
    const selection = this.selection();
    return selection?.kind === 'channel' ? this.chats.activeChatId() : null;
  }

  protected activeUserId(): string | null {
    const selection = this.selection();
    return selection?.kind === 'user' ? selection.id : null;
  }

  protected selectChannel(id: string): void {
    this.composingChanged.emit(false);
    this.directMessageSelected.emit(null);
    this.selection.set({ kind: 'channel', id });
    this.chats.selectChat(id);
  }

  protected selectUser(user: DirectMessageUser): void {
    this.composingChanged.emit(false);
    this.directMessageSelected.emit(user);
    this.selection.set({ kind: 'user', id: user.id });
  }

  protected startCompose(): void {
    this.selection.set(null);
    this.directMessageSelected.emit(null);
    this.composingChanged.emit(true);
  }
}
