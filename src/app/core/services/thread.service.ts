import { inject, Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  DocumentData,
  DocumentSnapshot,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  Unsubscribe,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { mapChatMessage } from '../models/message.mapper';
import { ChatMessage } from '../models/message.model';

export interface ThreadTarget {
  chatId: string;
  messageId: string;
}

@Injectable({ providedIn: 'root' })
export class ThreadService {
  private readonly firebase = inject(FirebaseService);
  private readonly targetState = signal<ThreadTarget | null>(null);
  private readonly parentState = signal<ChatMessage | null>(null);
  private readonly repliesState = signal<ChatMessage[]>([]);
  private subscriptions: Unsubscribe[] = [];
  private connectionVersion = 0;

  readonly target = this.targetState.asReadonly();
  readonly parent = this.parentState.asReadonly();
  readonly replies = this.repliesState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  open(chatId: string, messageId: string): void {
    const target = this.targetState();
    if (target?.chatId === chatId && target?.messageId === messageId) {
      return;
    }
    this.close();
    this.targetState.set({ chatId, messageId });
    this.loading.set(true);
    this.listenToParent(chatId, messageId);
    this.listenToReplies(chatId, messageId);
  }

  close(): void {
    this.connectionVersion++;
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];
    this.targetState.set(null);
    this.parentState.set(null);
    this.repliesState.set([]);
    this.loading.set(false);
    this.error.set('');
  }

  private listenToParent(chatId: string, messageId: string): void {
    const parentRef = doc(this.firebase.firestore, 'chats', chatId, 'messages', messageId);
    const version = this.connectionVersion;
    this.subscriptions.push(
      onSnapshot(
        parentRef,
        (snapshot) => this.handleParentSnapshot(snapshot, version),
        (error) => this.handleListenError(error, version),
      ),
    );
  }

  private handleParentSnapshot(snapshot: DocumentSnapshot<DocumentData>, version: number): void {
    if (version !== this.connectionVersion) {
      return;
    }
    const data = snapshot.data();
    this.parentState.set(data ? mapChatMessage(snapshot.id, data) : null);
  }

  private listenToReplies(chatId: string, messageId: string): void {
    const repliesQuery = query(
      collection(this.firebase.firestore, 'chats', chatId, 'messages'),
      where('threadParentId', '==', messageId),
      orderBy('createdAt', 'asc'),
    );
    const version = this.connectionVersion;
    this.subscriptions.push(
      onSnapshot(
        repliesQuery,
        (snapshot) => this.handleRepliesSnapshot(snapshot, version),
        (error) => this.handleListenError(error, version),
      ),
    );
  }

  private handleRepliesSnapshot(snapshot: QuerySnapshot<DocumentData>, version: number): void {
    if (version !== this.connectionVersion) {
      return;
    }
    this.repliesState.set(snapshot.docs.map((reply) => mapChatMessage(reply.id, reply.data())));
    this.loading.set(false);
  }

  private handleListenError(error: unknown, version: number): void {
    if (version !== this.connectionVersion) {
      return;
    }
    this.error.set(
      error instanceof Error ? error.message : 'Der Thread konnte nicht geladen werden.',
    );
    this.loading.set(false);
  }
}
