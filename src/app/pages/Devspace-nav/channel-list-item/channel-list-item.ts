import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-channel-list-item',
  styleUrl: './channel-list-item.scss',
  templateUrl: './channel-list-item.html',
})
export class ChannelListItem {
  readonly name = input.required<string>();
  readonly active = input(false);
  readonly selected = output<void>();
}
