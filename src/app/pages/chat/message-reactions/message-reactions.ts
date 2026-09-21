import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MessageReaction, ReactionEmoji } from '../../../core/models/reaction.model';
import { EmojiPicker } from '../../../shared/emoji-picker/emoji-picker';

@Component({
  imports: [EmojiPicker],
  selector: 'app-message-reactions',
  styleUrl: './message-reactions.scss',
  templateUrl: './message-reactions.html',
  host: {
    '(document:click)': 'closePickerOutside($event)',
  },
})
export class MessageReactions {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly reactions = input<MessageReaction[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly limit = input(20);
  readonly toggled = output<ReactionEmoji>();

  protected readonly expanded = signal(false);
  protected readonly pickerOpen = signal(false);
  protected readonly mobile = signal(typeof window !== 'undefined' && window.innerWidth <= 700);
  protected readonly visibleLimit = computed(() => (this.mobile() ? 7 : this.limit()));
  protected readonly visibleReactions = computed(() =>
    this.expanded() ? this.reactions() : this.reactions().slice(0, this.visibleLimit()),
  );
  protected readonly hiddenCount = computed(() =>
    Math.max(this.reactions().length - this.visibleReactions().length, 0),
  );

  protected toggleReaction(emoji: ReactionEmoji): void {
    this.toggled.emit(emoji);
    this.pickerOpen.set(false);
  }

  @HostListener('window:resize')
  protected updateViewport(): void {
    this.mobile.set(window.innerWidth <= 700);
  }

  protected togglePicker(): void {
    this.pickerOpen.update((open) => !open);
  }

  protected closePickerOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.pickerOpen.set(false);
    }
  }

  protected reactedByCurrentUser(reaction: MessageReaction): boolean {
    return reaction.users.some(({ id }) => id === this.currentUserId());
  }

  protected reactionNames(reaction: MessageReaction): string {
    return reaction.users
      .map(({ id, name }) => (id === this.currentUserId() ? 'Du' : name))
      .join(', ');
  }
}
