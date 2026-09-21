import { DatePipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
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

  readonly edited = output<string>();

  protected readonly menuOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly draft = signal('');

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected startEdit(): void {
    this.draft.set(this.message()?.text || '');
    this.menuOpen.set(false);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected saveEdit(): void {
    const text = this.draft().trim();

    if (text && text !== this.message()?.text) {
      this.edited.emit(text);
    }

    this.editing.set(false);
  }
}
