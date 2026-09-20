import { Component, input, output, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-message-input',
  styleUrl: './message-input.scss',
  templateUrl: './message-input.html',
})
export class MessageInput {
  readonly placeholder = input('Nachricht schreiben');
  readonly disabled = input(false);
  readonly messageSent = output<string>();

  protected readonly message = signal('');

  protected updateMessage(event: Event): void {
    this.message.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitMessage(): void {
    const message = this.message().trim();

    if (!message || this.disabled()) {
      return;
    }

    this.messageSent.emit(message);
    this.message.set('');
  }
}
