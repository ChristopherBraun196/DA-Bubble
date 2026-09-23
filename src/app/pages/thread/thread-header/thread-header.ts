import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-thread-header',
  styleUrl: './thread-header.scss',
  templateUrl: './thread-header.html',
})
/** Header of the thread panel, showing the channel and a close button. */
export class ThreadHeader {
  readonly channelName = input.required<string>();
  readonly closed = output<void>();
}
