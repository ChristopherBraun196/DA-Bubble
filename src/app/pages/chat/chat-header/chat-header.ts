import { Component, input, signal } from '@angular/core';

import { AddMembers } from '../add-members/add-members';
import { ChannelInfo } from '../channel-info/channel-info';
import { MembersDialog } from '../members-dialog/members-dialog';

/** Es ist immer hoechstens eine Card offen. */
export type ChatHeaderDialog = 'none' | 'channel' | 'members' | 'add';

@Component({
  imports: [MembersDialog, AddMembers, ChannelInfo],
  selector: 'app-chat-header',
  styleUrl: './chat-header.scss',
  templateUrl: './chat-header.html',
})
export class ChatHeader {
  readonly channelName = input.required<string>();
  /** Platzhalter-Avatare, kommen spaeter aus Firebase. */
  readonly members = input<string[]>([]);

  protected readonly dialog = signal<ChatHeaderDialog>('none');

  protected toggleChannel(): void {
    this.dialog.update((current) => (current === 'channel' ? 'none' : 'channel'));
  }

  protected toggleMembers(): void {
    this.dialog.update((current) => (current === 'members' ? 'none' : 'members'));
  }

  /** Wird aus der Mitglieder-Card und ueber den Plus-Button aufgerufen. */
  protected openAdd(): void {
    this.dialog.set('add');
  }

  protected closeDialog(): void {
    this.dialog.set('none');
  }
}
