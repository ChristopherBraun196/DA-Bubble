import { Component, computed, input } from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';
import { MessageItem } from '../message-item/message-item';

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
  readonly currentUserId = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input('');

  protected readonly entries = computed(() => this.createEntries(this.messages()));

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
