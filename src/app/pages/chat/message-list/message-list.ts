import { MessageSearchResult } from '../../../core/models/message-search.model';
import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';
import { ReactionEmoji } from '../../../core/models/reaction.model';
import { MessageItem } from '../message-item/message-item';

/** Reports an edited message body back to the host. */
export interface MessageEdit {
  id: string;
  text: string;
}

/** Reports a reaction that should be added or removed. */
export interface MessageReactionToggle {
  id: string;
  emoji: ReactionEmoji;
}

/** Ab diesem Abstand zum Ende gilt die Liste als "unten" und folgt neuen Nachrichten. */
const BOTTOM_THRESHOLD = 120;

type MessageListEntry =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: ChatMessage };

@Component({
  imports: [MessageItem],
  selector: 'app-message-list',
  styleUrl: './message-list.scss',
  templateUrl: './message-list.html',
})
/**
 * Scrollable message list grouped by day.
 *
 * @remarks
 * Sticks to the bottom while the user is reading along, but leaves the
 * position alone once they have scrolled up into the history.
 */
export class MessageList {
  readonly messages = input<ChatMessage[]>([]);
  readonly searchTarget = input<MessageSearchResult | null>(null);
  private readonly messageElements = viewChildren<unknown, ElementRef<HTMLElement>>(
    'messageElement',
    {
      read: ElementRef,
    },
  );
  private lastScrolledTarget: MessageSearchResult | null = null;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private scrollContainer: HTMLElement | null = null;
  private latestRenderedId = '';
  private firstRender = true;
  private pinnedToBottom = true;
  private readonly handleScroll = () => this.updatePinnedState();

  readonly currentUserId = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly inThread = input(false);
  readonly emptyText = input('Noch keine Nachrichten. Schreib die erste Nachricht.');
  readonly messageEdited = output<MessageEdit>();
  readonly reactionToggled = output<MessageReactionToggle>();
  readonly threadOpened = output<string>();

  protected readonly targetMissing = computed(
    () =>
      this.searchTarget() &&
      !this.loading() &&
      !this.messages().some((message) => message.id === this.searchTarget()?.messageId),
  );

  protected readonly entries = computed(() => this.createEntries(this.messages()));

  constructor() {
    afterRenderEffect(() => this.updateScrollPosition());
    this.destroyRef.onDestroy(() => this.detachScrollListener());
  }

  /** Springt zum Suchtreffer, sonst bleibt die Liste am unteren Ende. */
  /** Scrolls to the newest message or to a selected search hit. */
  private updateScrollPosition(): void {
    const messages = this.messages();
    const container = this.resolveScrollContainer();
    if (!container) return;
    const jumpedToSearchHit = this.scrollToSearchTarget();
    if (!this.trackLatestMessage(messages) || jumpedToSearchHit) return;
    if (this.firstRender || this.pinnedToBottom || this.isOwnMessage(messages.at(-1))) {
      this.scrollToBottom(container);
    }
  }

  /**
   * Detects whether a new message arrived since the last render.
   *
   * @param messages - The current list.
   * @returns True when the list grew at the bottom.
   */
  private trackLatestMessage(messages: ChatMessage[]): boolean {
    if (messages.length === 0) {
      this.resetScrollState();
      return false;
    }
    const latestId = messages[messages.length - 1].id;
    if (latestId === this.latestRenderedId) return false;
    this.firstRender = this.latestRenderedId === '';
    this.latestRenderedId = latestId;
    return true;
  }

  /** Clears the scroll bookkeeping when the chat changes. */
  private resetScrollState(): void {
    this.latestRenderedId = '';
    this.firstRender = true;
    this.pinnedToBottom = true;
  }

  /**
   * Whether a message was written by the signed-in user.
   *
   * @param message - The message to test.
   * @returns True for the user's own messages.
   */
  private isOwnMessage(message: ChatMessage | undefined): boolean {
    return !!message && !!this.currentUserId() && message.authorId === this.currentUserId();
  }

  /** Jumps to the end of the list. */
  private scrollToBottom(container: HTMLElement): void {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: this.firstRender ? 'auto' : 'smooth',
    });
    this.pinnedToBottom = true;
  }

  /** Records whether the user is still reading at the bottom. */
  private updatePinnedState(): void {
    const container = this.scrollContainer;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    this.pinnedToBottom = distance <= BOTTOM_THRESHOLD;
  }

  /** Returns the scrolling element, resolving it on first use. */
  private resolveScrollContainer(): HTMLElement | null {
    if (this.scrollContainer?.isConnected) return this.scrollContainer;
    this.detachScrollListener();
    this.scrollContainer = this.findScrollContainer();
    this.scrollContainer?.addEventListener('scroll', this.handleScroll, { passive: true });
    return this.scrollContainer;
  }

  /**
   * Walks up the DOM to find the scrolling ancestor.
   *
   * @returns The scroll container, or `null` when none was found.
   */
  private findScrollContainer(): HTMLElement | null {
    let element = this.host.nativeElement.parentElement;
    while (element) {
      const overflow = getComputedStyle(element).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') return element;
      element = element.parentElement;
    }
    return null;
  }

  /** Removes the scroll listener when the component goes away. */
  private detachScrollListener(): void {
    this.scrollContainer?.removeEventListener('scroll', this.handleScroll);
    this.scrollContainer = null;
  }

  /**
   * Scrolls to the message selected in the search.
   *
   * @returns True when the target was found and scrolled to.
   */
  private scrollToSearchTarget(): boolean {
    const target = this.searchTarget();
    const elements = this.messageElements();
    if (!target || target === this.lastScrolledTarget) return false;
    const element = elements.find(
      (item) => item.nativeElement.dataset['messageId'] === target.messageId,
    );
    if (!element) return false;
    element.nativeElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.lastScrolledTarget = target;
    return true;
  }

  /**
   * Interleaves messages with the date separators between days.
   *
   * @param messages - The messages in chronological order.
   * @returns Rows of messages and date markers.
   */
  private createEntries(messages: ChatMessage[]): MessageListEntry[] {
    const entries: MessageListEntry[] = [];
    let previousDateKey = '';
    for (const message of messages) {
      const date = this.getMessageDate(message);
      previousDateKey = this.addDateEntry(entries, date, previousDateKey);
      entries.push({ type: 'message', id: message.id, message });
    }
    return entries;
  }

  /** Returns a message's timestamp, falling back to now while it is pending. */
  private getMessageDate(message: ChatMessage): Date {
    return message.createdAt?.toDate() || new Date();
  }

  /**
   * Inserts a date separator when the day changes.
   *
   * @param entries - The rows assembled so far.
   * @param date - The current message's date.
   * @param previousKey - Day key of the previous message.
   * @returns The day key now in effect.
   */
  private addDateEntry(entries: MessageListEntry[], date: Date, previousKey: string): string {
    const dateKey = this.getDateKey(date);
    if (dateKey === previousKey) {
      return previousKey;
    }
    entries.push(this.createDateEntry(date, dateKey));
    return dateKey;
  }

  /**
   * Builds a date separator row.
   *
   * @param date - The day being introduced.
   * @param dateKey - Its stable key.
   * @returns The separator row.
   */
  private createDateEntry(date: Date, dateKey: string): MessageListEntry {
    return {
      type: 'date',
      id: `date-${dateKey}`,
      label: this.getDateLabel(date),
    };
  }

  /**
   * Formats a date as a comparable day key.
   *
   * @param date - The date to reduce.
   * @returns The key in `YYYY-MM-DD` form.
   */
  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Builds the label of a date separator.
   *
   * @param date - The day being introduced.
   * @returns "Heute", "Gestern" or the written-out date.
   */
  private getDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = this.getYesterday(today);
    if (this.isSameDate(date, today)) {
      return 'Heute';
    }
    if (this.isSameDate(date, yesterday)) {
      return 'Gestern';
    }
    return this.formatLongDate(date);
  }

  /** Returns the day before the given date. */
  private getYesterday(today: Date): Date {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday;
  }

  /** Whether two dates fall on the same day. */
  private isSameDate(first: Date, second: Date): boolean {
    return this.getDateKey(first) === this.getDateKey(second);
  }

  /**
   * Writes out a date in German.
   *
   * @param date - The date to format.
   * @returns For example "Montag, 21 September".
   */
  private formatLongDate(date: Date): string {
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date);
    const month = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(date);
    return `${weekday}, ${date.getDate()} ${month}`;
  }
}
