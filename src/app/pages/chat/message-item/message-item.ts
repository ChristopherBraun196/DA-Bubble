import { DatePipe } from '@angular/common';
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';
import { ReactionEmoji } from '../../../core/models/reaction.model';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { EmojiPicker } from '../../../shared/emoji-picker/emoji-picker';
import { MessageReactions } from '../message-reactions/message-reactions';

@Component({
  imports: [DatePipe, AvatarFallback, MessageReactions, EmojiPicker],
  selector: 'app-message-item',
  styleUrl: './message-item.scss',
  templateUrl: './message-item.html',
  host: {
    '(document:click)': 'closePopoversOutside($event)',
  },
})
export class MessageItem {
  readonly message = input<ChatMessage | null>(null);
  readonly ownMessage = input(false);
  readonly currentUserId = input<string | null>(null);

  readonly edited = output<string>();
  readonly reactionToggled = output<ReactionEmoji>();

  protected readonly menuOpen = signal(false);
  protected readonly reactionPickerOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly draft = signal('');

  private readonly menuWrap = viewChild<ElementRef<HTMLElement>>('menuWrap');
  private readonly reactionPickerWrap = viewChild<ElementRef<HTMLElement>>('reactionPickerWrap');

  protected toggleMenu(): void {
    this.reactionPickerOpen.set(false);
    this.menuOpen.update((open) => !open);
  }

  protected toggleReactionPicker(): void {
    this.menuOpen.set(false);
    this.reactionPickerOpen.update((open) => !open);
  }

  protected closePopoversOutside(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.menuOpen() && !this.menuWrap()?.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
    if (this.reactionPickerOpen() && !this.reactionPickerWrap()?.nativeElement.contains(target)) {
      this.reactionPickerOpen.set(false);
    }
  }

  protected toggleReaction(emoji: ReactionEmoji): void {
    this.reactionToggled.emit(emoji);
    this.reactionPickerOpen.set(false);
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
