import { Component, input, signal } from '@angular/core';

import { MembersDialog } from '../members-dialog/members-dialog';

@Component({
  imports: [MembersDialog],
  selector: 'app-chat-header',
  styleUrl: './chat-header.scss',
  templateUrl: './chat-header.html',
})
export class ChatHeader {
  readonly channelName = input.required<string>();
  /** Platzhalter-Avatare, kommen spaeter aus Firebase. */
  readonly members = input<string[]>([]);

  protected readonly membersOpen = signal(false);

  protected toggleMembers(): void {
    this.membersOpen.update((value) => !value);
  }

  protected closeMembers(): void {
    this.membersOpen.set(false);
  }
}
