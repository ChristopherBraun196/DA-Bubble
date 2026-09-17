import { Component, signal } from '@angular/core';
import { ChannelList } from '../channel-list/channel-list';
import { DirectMessageList } from '../direct-message-list/direct-message-list';

/** Was gerade im Chat offen ist: entweder ein Channel oder eine Direktnachricht. */
export type DevspaceSelection =
  | { kind: 'channel'; id: string }
  | { kind: 'user'; id: string };

@Component({
  imports: [ChannelList, DirectMessageList],
  selector: 'app-devspace-nav',
  styleUrl: './devspace-nav.scss',
  templateUrl: './devspace-nav.html',
})
export class DevspaceNav {
  protected readonly selection = signal<DevspaceSelection>({
    kind: 'channel',
    id: 'entwicklerteam',
  });

  protected activeChannelId(): string | null {
    const selection = this.selection();
    return selection.kind === 'channel' ? selection.id : null;
  }

  protected activeUserId(): string | null {
    const selection = this.selection();
    return selection.kind === 'user' ? selection.id : null;
  }

  protected selectChannel(id: string): void {
    this.selection.set({ kind: 'channel', id });
  }

  protected selectUser(id: string): void {
    this.selection.set({ kind: 'user', id });
  }
}
