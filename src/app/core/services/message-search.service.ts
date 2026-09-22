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

  connect(chatIds: string[]): void {
    this.disconnect();
    const version = this.connectionVersion;
    chatIds.forEach((id) => this.pending.add(id));
    this.loading.set(chatIds.length > 0);
    chatIds.forEach((id) => this.listen(id, version));
  }

  private listen(chatId: string, version: number): void {
    const messages = collection(this.firebase.firestore, 'chats', chatId, 'messages');
    const unsubscribe = onSnapshot(
      messages,
      (snapshot) => this.handleSnapshot(chatId, snapshot, version),
      () => this.handleError(chatId, version),
    );
    this.subscriptions.push(unsubscribe);
  }

  private handleSnapshot(chatId: string, snapshot: QuerySnapshot, version: number): void {
    if (version !== this.connectionVersion) return;
    const messages = snapshot.docs
      .map((doc) => this.mapMessage(chatId, doc))
      .filter((message): message is MessageSearchResult => message !== null);
    this.byChat.set(chatId, messages);
    this.publish(chatId);
  }

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

  private publish(chatId: string): void {
    this.pending.delete(chatId);
    this.loading.set(this.pending.size > 0);
    this.messages.set(
      [...this.byChat.values()]
        .flat()
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    );
  }

  private handleError(chatId: string, version: number): void {
    if (version !== this.connectionVersion) return;
    this.byChat.delete(chatId);
    this.error.set('Nicht alle Nachrichten konnten geladen werden. Suche bitte erneut öffnen.');
    this.publish(chatId);
  }

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
