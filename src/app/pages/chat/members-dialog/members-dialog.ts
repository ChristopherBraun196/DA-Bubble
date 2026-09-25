import { Component, computed, input, output } from '@angular/core';

import { ChannelMember, toChannelMembers } from '../../../core/models/channel-member.model';
import { AppUser } from '../../../core/models/user.model';
import { UserListItem } from '../../Devspace-nav/user-list-item/user-list-item';

@Component({
  imports: [UserListItem],
  selector: 'app-members-dialog',
  styleUrl: './members-dialog.scss',
  templateUrl: './members-dialog.html',
})
/** Lists everyone in a channel and offers to add more. */
export class MembersDialog {
  readonly channelMembers = input<AppUser[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly closed = output<void>();
  readonly addRequested = output<void>();
  readonly memberSelected = output<AppUser>();

  protected readonly members = computed<ChannelMember[]>(() =>
    toChannelMembers(this.channelMembers(), this.currentUserId()),
  );

  /** Switches over to the dialog for adding members. */
  protected addMembers(): void {
    this.addRequested.emit();
  }
}
