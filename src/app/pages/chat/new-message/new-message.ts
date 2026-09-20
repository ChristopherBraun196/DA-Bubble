import { Component, signal } from '@angular/core';
import { MessageInput } from '../message-input/message-input';

@Component({
  imports: [MessageInput],
  selector: 'app-new-message',
  styleUrl: './new-message.scss',
  templateUrl: './new-message.html',
})
export class NewMessage {
  //  todo: Empfänger und  Chat anlegen.
  protected readonly recipient = signal('');

  protected updateRecipient(event: Event): void {
    this.recipient.set((event.target as HTMLInputElement).value);
  }
}
