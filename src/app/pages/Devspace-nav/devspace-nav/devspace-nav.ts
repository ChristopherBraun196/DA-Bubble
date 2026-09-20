import { Component, inject, signal } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';
import { ChannelList } from '../channel-list/channel-list';
import { DirectMessageList } from '../direct-message-list/direct-message-list';

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

  protected readonly selection = signal<DevspaceSelection>({
    kind: 'channel',
    id: 'entwicklerteam',
  });

  protected activeChannelId(): string | null {
    const selection = this.selection();
    return selection.kind === 'channel' ? this.chats.activeChatId() : null;
  }

  protected activeUserId(): string | null {
    const selection = this.selection();
    return selection.kind === 'user' ? selection.id : null;
  }

  protected selectChannel(id: string): void {
    this.selection.set({ kind: 'channel', id });
    this.chats.selectChat(id);
  }

  protected selectUser(id: string): void {
    this.selection.set({ kind: 'user', id });
  }
}
