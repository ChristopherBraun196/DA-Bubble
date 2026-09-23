import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  collection,
  onSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { MessageSearchResult } from '../models/message-search.model';

/** Laedt die Channel-Verlaeufe nur waehrend einer Textsuche, nicht bei jedem Tastendruck. */
@Injectable()
/**
 * Keeps a searchable copy of the most recent messages across all chats.
 *
 * @remarks
 * Firestore cannot query message text, so a bounded window per chat is held
 * in memory and filtered client-side by the workspace search.
 */
export class MessageSearchService {
  private readonly firebase = inject(FirebaseService);
  private readonly destroyRef = inject(DestroyRef);
  private subscriptions: Unsubscribe[] = [];
  private readonly byChat = new Map<string, MessageSearchResult[]>();
  private readonly pending = new Set<string>();
  private connectionVersion = 0;

  readonly messages = signal<MessageSearchResult[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /**
   * Starts following the given chats.
   *
   * @param chatIds - Ids of every chat the user belongs to.
   */
  connect(chatIds: string[]): void {
    this.disconnect();
    const version = this.connectionVersion;
    chatIds.forEach((id) => this.pending.add(id));
    this.loading.set(chatIds.length > 0);
    chatIds.forEach((id) => this.listen(id, version));
  }

  /** Subscribes to the recent messages of one chat. */
  private listen(chatId: string, version: number): void {
    const messages = collection(this.firebase.firestore, 'chats', chatId, 'messages');
    const unsubscribe = onSnapshot(
      messages,
      (snapshot) => this.handleSnapshot(chatId, snapshot, version),
      () => this.handleError(chatId, version),
    );
    this.subscriptions.push(unsubscribe);
  }

  /** Stores one chat's results unless the connection has been replaced. */
  private handleSnapshot(chatId: string, snapshot: QuerySnapshot, version: number): void {
    if (version !== this.connectionVersion) return;
    const messages = snapshot.docs
      .map((doc) => this.mapMessage(chatId, doc))
      .filter((message): message is MessageSearchResult => message !== null);
    this.byChat.set(chatId, messages);
    this.publish(chatId);
  }

  /**
   * Converts a message document into a search result.
   *
   * @param chatId - The chat the message belongs to.
   * @param snapshot - The message document.
   * @returns The search result, or `null` for messages without text or date.
   */
  private mapMessage(chatId: string, snapshot: QueryDocumentSnapshot): MessageSearchResult | null {
    const data = snapshot.data();
    if (data['threadParentId'] || !(data['createdAt'] instanceof Timestamp)) return null;
    return {
      chatId,
      messageId: snapshot.id,
      text: data['text'] || '',
      authorName: data['authorName'] || 'Unbekannter Nutzer',
      createdAt: data['createdAt'],
    };
  }

  /** Merges all chats' results into the published, newest-first list. */
  private publish(chatId: string): void {
    this.pending.delete(chatId);
    this.loading.set(this.pending.size > 0);
    this.messages.set(
      [...this.byChat.values()]
        .flat()
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    );
  }

  /** Drops a chat's results when its listener failed. */
  private handleError(chatId: string, version: number): void {
    if (version !== this.connectionVersion) return;
    this.byChat.delete(chatId);
    this.error.set('Nicht alle Nachrichten konnten geladen werden. Suche bitte erneut öffnen.');
    this.publish(chatId);
  }

  /** Stops all listeners and clears the cached results. */
  disconnect(): void {
    this.connectionVersion++;
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];
    this.byChat.clear();
    this.pending.clear();
    this.messages.set([]);
    this.loading.set(false);
    this.error.set('');
  }
}
