import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';
import { ChannelListItem } from '../channel-list-item/channel-list-item';
import { CreateChannel } from '../create-channel/create-channel';

@Component({
  imports: [ChannelListItem, CreateChannel],
  selector: 'app-channel-list',
  styleUrl: './channel-list.scss',
  templateUrl: './channel-list.html',
})
export class ChannelList {
  private readonly chatService = inject(ChatService);

  readonly activeChannelId = input<string | null>(null);
  readonly channelSelected = output<string>();

  protected readonly expanded = signal(true);
  protected readonly channels = computed(() =>
    this.chatService.chats().filter(({ type }) => type === 'channel'),
  );
  protected readonly dialogOpen = signal(false);

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }

  protected openDialog(): void {
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
  }
}
