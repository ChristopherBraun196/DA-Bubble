import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChannelMemberService } from '../../../core/services/channel-member.service';
import { ChatService } from '../../../core/services/chat.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { ProfileDialog } from '../../main/profile-dialog/profile-dialog';
import { AddMembers } from '../add-members/add-members';
import { ChannelInfo } from '../channel-info/channel-info';
import { MembersDialog } from '../members-dialog/members-dialog';

/** Es ist immer hoechstens eine Card offen. */
/** Which popover the header currently shows. */
export type ChatHeaderDialog = 'none' | 'channel' | 'members' | 'add';

@Component({
  imports: [MembersDialog, AddMembers, ChannelInfo, AvatarFallback, ProfileDialog],
  selector: 'app-chat-header',
  styleUrl: './chat-header.scss',
  templateUrl: './chat-header.html',
})
/** Channel header with name, member avatars and their dialogs. */
export class ChatHeader {
  protected readonly auth = inject(AuthService);
  protected readonly channelMembers = inject(ChannelMemberService);
  private readonly chats = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly channelName = input.required<string>();
  readonly directMessageRequested = output<AppUser>();

  protected readonly dialog = signal<ChatHeaderDialog>('none');
  protected readonly selectedMember = signal<AppUser | null>(null);
  protected readonly activeChat = computed(() =>
    this.chats.chats().find(({ id }) => id === this.chats.activeChatId()),
  );
  protected readonly memberAvatars = computed(() =>
    this.channelMembers
      .members()
      .slice(0, 3)
      .map(({ photoURL }) => photoURL),
  );
  protected readonly memberCount = computed(() => this.activeChat()?.memberIds.length || 0);

  constructor() {
    effect(() => {
      this.channelMembers.connect(this.activeChat()?.memberIds || []);
    });

    this.destroyRef.onDestroy(() => this.channelMembers.disconnect());
  }

  /** Opens or closes the channel details popover. */
  protected toggleChannel(): void {
    this.dialog.update((current) => (current === 'channel' ? 'none' : 'channel'));
  }

  /** Opens or closes the member list popover. */
  protected toggleMembers(): void {
    this.dialog.update((current) => (current === 'members' ? 'none' : 'members'));
  }

  /** Wird aus der Mitglieder-Card und ueber den Plus-Button aufgerufen. */
  /** Switches to the dialog for adding members. */
  protected openAdd(): void {
    this.selectedMember.set(null);
    this.dialog.set('add');
  }

  /**
   * Shows a member's profile.
   *
   * @param member - The member that was clicked.
   */
  protected openProfile(member: AppUser): void {
    this.selectedMember.set(member);
  }

  /** Closes the member profile. */
  protected closeProfile(): void {
    this.selectedMember.set(null);
  }

  /** Closes whichever popover is open. */
  protected closeDialog(): void {
    this.selectedMember.set(null);
    this.dialog.set('none');
  }

  /**
   * Starts a direct conversation with a member.
   *
   * @param member - The member to write to.
   */
  protected openDirectMessage(member: AppUser): void {
    this.closeDialog();
    this.directMessageRequested.emit(member);
  }
}
