import { Component, computed, signal } from '@angular/core';
import { ChatHeader } from '../chat-header/chat-header';
import { MessageInput } from '../message-input/message-input';

@Component({
  imports: [ChatHeader, MessageInput],
  selector: 'app-chat-view',
  styleUrl: './chat-view.scss',
  templateUrl: './chat-view.html',
})
export class ChatView {
  /** Platzhalter, kommt spaeter aus Firebase. */
  protected readonly channelName = signal('Entwicklerteam');

  protected readonly members = signal<string[]>([
    '/img/Profile_picture_3.png',
    '/img/Profile_picture_2.png',
    '/img/Profile_picture_1.png',
  ]);

  protected readonly placeholder = computed(() => `Nachricht an #${this.channelName()}`);
}
