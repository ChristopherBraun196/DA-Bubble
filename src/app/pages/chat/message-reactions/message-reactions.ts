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
/**
 * Reaction chips below a message, with the picker for adding more.
 *
 * @remarks
 * Shows at most {@link MessageReactions.limit} reactions on desktop and seven
 * on narrow viewports; the rest hide behind a "+ x weitere" toggle.
 */
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

  /**
   * Reports that a reaction should be added or removed.
   *
   * @param emoji - The emoji that was picked.
   */
  protected toggleReaction(emoji: ReactionEmoji): void {
    this.toggled.emit(emoji);
    this.pickerOpen.set(false);
  }

  @HostListener('window:resize')
  /** Re-evaluates the mobile breakpoint after a resize. */
  protected updateViewport(): void {
    this.mobile.set(window.innerWidth <= 700);
  }

  /** Opens or closes the emoji picker. */
  protected togglePicker(): void {
    this.pickerOpen.update((open) => !open);
  }

  /** Closes the picker on a click outside the component. */
  protected closePickerOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.pickerOpen.set(false);
    }
  }

  /**
   * Whether the signed-in user is part of a reaction.
   *
   * @param reaction - The reaction to test.
   * @returns True when the user already reacted with it.
   */
  protected reactedByCurrentUser(reaction: MessageReaction): boolean {
    return reaction.users.some(({ id }) => id === this.currentUserId());
  }

  /**
   * Builds the tooltip listing who reacted.
   *
   * @param reaction - The reaction to describe.
   * @returns The names, joined for display.
   */
  protected reactionNames(reaction: MessageReaction): string {
    return reaction.users
      .map(({ id, name }) => (id === this.currentUserId() ? 'Du' : name))
      .join(', ');
  }
}
