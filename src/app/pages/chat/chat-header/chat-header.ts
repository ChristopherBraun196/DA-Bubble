import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { ChannelMemberService } from '../../../core/services/channel-member.service';
import { ChatService } from '../../../core/services/chat.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { AddMembers } from '../add-members/add-members';
import { ChannelInfo } from '../channel-info/channel-info';
import { MembersDialog } from '../members-dialog/members-dialog';

/** Es ist immer hoechstens eine Card offen. */
export type ChatHeaderDialog = 'none' | 'channel' | 'members' | 'add';

@Component({
  imports: [MembersDialog, AddMembers, ChannelInfo, AvatarFallback],
  selector: 'app-chat-header',
  styleUrl: './chat-header.scss',
  templateUrl: './chat-header.html',
})
export class ChatHeader {
  protected readonly auth = inject(AuthService);
  protected readonly channelMembers = inject(ChannelMemberService);
  private readonly chats = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly channelName = input.required<string>();

  protected readonly dialog = signal<ChatHeaderDialog>('none');
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
