import { DatePipe } from '@angular/common';
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';

@Component({
  imports: [DatePipe, AvatarFallback],
  selector: 'app-message-item',
  styleUrl: './message-item.scss',
  templateUrl: './message-item.html',
  host: {
    '(document:click)': 'closeMenuOnOutsideClick($event)',
  },
})
export class MessageItem {
  readonly message = input<ChatMessage | null>(null);
  readonly ownMessage = input(false);

  readonly edited = output<string>();

  protected readonly menuOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly draft = signal('');

  private readonly menuWrap = viewChild<ElementRef<HTMLElement>>('menuWrap');

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    const wrap = this.menuWrap()?.nativeElement;

    if (wrap && !wrap.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
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
