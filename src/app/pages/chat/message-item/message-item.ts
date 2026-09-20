import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';

@Component({
  imports: [DatePipe],
  selector: 'app-message-item',
  styleUrl: './message-item.scss',
  templateUrl: './message-item.html',
})
export class MessageItem {
  readonly message = input<ChatMessage | null>(null);
  readonly ownMessage = input(false);
}
