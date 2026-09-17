import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-chat-header',
  styleUrl: './chat-header.scss',
  templateUrl: './chat-header.html',
})
export class ChatHeader {
  readonly channelName = input.required<string>();
  /** Platzhalter-Avatare, kommen spaeter aus Firebase. */
  readonly members = input<string[]>([]);
}
