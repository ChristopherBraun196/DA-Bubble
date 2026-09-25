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

/** Identifies the message a thread panel is currently showing. */
export interface ThreadTarget {
  chatId: string;
  messageId: string;
}

@Injectable({ providedIn: 'root' })
/**
 * Streams a single thread: its parent message and all replies.
 *
 * @remarks
 * Keeps two subscriptions, because the parent lives among the chat's messages
 * while its replies are selected by `threadParentId`. A version counter drops
 * late snapshots after the user has already switched threads.
 */
export class ThreadService {
  private readonly firebase = inject(FirebaseService);
  private readonly targetState = signal<ThreadTarget | null>(null);
  private readonly parentState = signal<ChatMessage | null>(null);
  private readonly repliesState = signal<ChatMessage[]>([]);
  private readonly openRequestState = signal(0);
  private subscriptions: Unsubscribe[] = [];
  private connectionVersion = 0;

  readonly target = this.targetState.asReadonly();
  readonly parent = this.parentState.asReadonly();
  readonly replies = this.repliesState.asReadonly();
  /**
   * Counts calls to {@link ThreadService.open}, including repeats for the
   * thread already shown. Lets callers react to an open request even when the
   * target itself does not change.
   */
  readonly openRequests = this.openRequestState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  /**
   * Opens a thread and starts following parent and replies.
   *
   * @param chatId - Id of the chat the message belongs to.
   * @param messageId - Id of the message the thread hangs off.
   */
  open(chatId: string, messageId: string): void {
    this.openRequestState.update((count) => count + 1);
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

  /** Closes the thread and stops both subscriptions. */
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

  /** Subscribes to the message the thread belongs to. */
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

  /** Stores the parent message unless the thread has meanwhile changed. */
  private handleParentSnapshot(snapshot: DocumentSnapshot<DocumentData>, version: number): void {
    if (version !== this.connectionVersion) {
      return;
    }
    const data = snapshot.data();
    this.parentState.set(data ? mapChatMessage(snapshot.id, data) : null);
  }

  /** Subscribes to all replies carrying this message as their parent. */
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

  /** Stores the replies unless the thread has meanwhile changed. */
  private handleRepliesSnapshot(snapshot: QuerySnapshot<DocumentData>, version: number): void {
    if (version !== this.connectionVersion) {
      return;
    }
    this.repliesState.set(snapshot.docs.map((reply) => mapChatMessage(reply.id, reply.data())));
    this.loading.set(false);
  }

  /** Surfaces a listener failure as a readable error message. */
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
