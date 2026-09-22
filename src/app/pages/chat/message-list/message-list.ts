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

export interface MessageEdit {
  id: string;
  text: string;
}

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

  private resetScrollState(): void {
    this.latestRenderedId = '';
    this.firstRender = true;
    this.pinnedToBottom = true;
  }

  private isOwnMessage(message: ChatMessage | undefined): boolean {
    return !!message && !!this.currentUserId() && message.authorId === this.currentUserId();
  }

  private scrollToBottom(container: HTMLElement): void {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: this.firstRender ? 'auto' : 'smooth',
    });
    this.pinnedToBottom = true;
  }

  private updatePinnedState(): void {
    const container = this.scrollContainer;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    this.pinnedToBottom = distance <= BOTTOM_THRESHOLD;
  }

  private resolveScrollContainer(): HTMLElement | null {
    if (this.scrollContainer?.isConnected) return this.scrollContainer;
    this.detachScrollListener();
    this.scrollContainer = this.findScrollContainer();
    this.scrollContainer?.addEventListener('scroll', this.handleScroll, { passive: true });
    return this.scrollContainer;
  }

  private findScrollContainer(): HTMLElement | null {
    let element = this.host.nativeElement.parentElement;
    while (element) {
      const overflow = getComputedStyle(element).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') return element;
      element = element.parentElement;
    }
    return null;
  }

  private detachScrollListener(): void {
    this.scrollContainer?.removeEventListener('scroll', this.handleScroll);
    this.scrollContainer = null;
  }

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

  private getMessageDate(message: ChatMessage): Date {
    return message.createdAt?.toDate() || new Date();
  }

  private addDateEntry(entries: MessageListEntry[], date: Date, previousKey: string): string {
    const dateKey = this.getDateKey(date);
    if (dateKey === previousKey) {
      return previousKey;
    }
    entries.push(this.createDateEntry(date, dateKey));
    return dateKey;
  }

  private createDateEntry(date: Date, dateKey: string): MessageListEntry {
    return {
      type: 'date',
      id: `date-${dateKey}`,
      label: this.getDateLabel(date),
    };
  }

  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

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

  private getYesterday(today: Date): Date {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday;
  }

  private isSameDate(first: Date, second: Date): boolean {
    return this.getDateKey(first) === this.getDateKey(second);
  }

  private formatLongDate(date: Date): string {
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date);
    const month = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(date);
    return `${weekday}, ${date.getDate()} ${month}`;
  }
}
