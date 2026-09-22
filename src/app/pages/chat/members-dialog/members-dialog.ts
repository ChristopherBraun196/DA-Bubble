import { Component, computed, input, output } from '@angular/core';

import { AppUser } from '../../../core/models/user.model';
import { UserListItem } from '../../Devspace-nav/user-list-item/user-list-item';

export interface ChannelMember {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  user: AppUser;
}

@Component({
  imports: [UserListItem],
  selector: 'app-members-dialog',
  styleUrl: './members-dialog.scss',
  templateUrl: './members-dialog.html',
})
export class MembersDialog {
  readonly channelMembers = input<AppUser[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly closed = output<void>();
  readonly addRequested = output<void>();
  readonly memberSelected = output<AppUser>();

  protected readonly members = computed<ChannelMember[]>(() => this.createMembers());

  private createMembers(): ChannelMember[] {
    const currentUserId = this.currentUserId();
    return [...this.channelMembers()]
      .sort((first, second) => this.sortCurrentUser(first, second, currentUserId))
      .map((member) => this.mapMember(member, currentUserId));
  }

  private sortCurrentUser(first: AppUser, second: AppUser, currentUserId: string | null): number {
    return Number(second.uid === currentUserId) - Number(first.uid === currentUserId);
  }

  private mapMember(member: AppUser, currentUserId: string | null): ChannelMember {
    return {
      id: member.uid,
      name: member.uid === currentUserId ? `${member.displayName} (Du)` : member.displayName,
      avatar: member.photoURL,
      online: member.uid === currentUserId,
      user: member,
    };
  }

  protected addMembers(): void {
    this.addRequested.emit();
  }
}
