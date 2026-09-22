import { DatePipe } from '@angular/common';
import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
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
  readonly inThread = input(false);

  readonly edited = output<string>();
  readonly reactionToggled = output<ReactionEmoji>();
  readonly threadOpened = output<void>();

  protected readonly replyLabel = computed(() => {
    const count = this.message()?.replyCount || 0;
    return count === 1 ? '1 Antwort' : `${count} Antworten`;
  });

  protected readonly menuOpen = signal(false);
  protected readonly reactionPickerOpen = signal(false);
  protected readonly editEmojiOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly draft = signal('');

  private readonly menuWrap = viewChild<ElementRef<HTMLElement>>('menuWrap');
  private readonly reactionPickerWrap = viewChild<ElementRef<HTMLElement>>('reactionPickerWrap');
  private readonly editEmojiWrap = viewChild<ElementRef<HTMLElement>>('editEmojiWrap');
  private readonly editField = viewChild<ElementRef<HTMLTextAreaElement>>('editField');

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
    if (this.editEmojiOpen() && !this.editEmojiWrap()?.nativeElement.contains(target)) {
      this.editEmojiOpen.set(false);
    }
  }

  protected toggleEditEmojiPicker(): void {
    this.editEmojiOpen.update((open) => !open);
  }

  protected insertEmoji(emoji: string): void {
    const field = this.editField()?.nativeElement;
    const start = field?.selectionStart ?? this.draft().length;
    const end = field?.selectionEnd ?? start;
    this.draft.update((text) => text.slice(0, start) + emoji + text.slice(end));
    this.editEmojiOpen.set(false);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
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
    this.editEmojiOpen.set(false);
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

    this.editEmojiOpen.set(false);
    this.editing.set(false);
  }
}
