import { Component, input, output, signal } from '@angular/core';
import { ChannelListItem } from '../channel-list-item/channel-list-item';

export interface Channel {
  id: string;
  name: string;
}

@Component({
  imports: [ChannelListItem],
  selector: 'app-channel-list',
  styleUrl: './channel-list.scss',
  templateUrl: './channel-list.html',
})
export class ChannelList {
  readonly activeChannelId = input<string | null>(null);
  readonly channelSelected = output<string>();

  protected readonly expanded = signal(true);

  /** Platzhalter, kommt spaeter aus Firebase. */
  protected readonly channels = signal<Channel[]>([
    { id: 'entwicklerteam', name: 'Entwicklerteam' },
  ]);

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}
