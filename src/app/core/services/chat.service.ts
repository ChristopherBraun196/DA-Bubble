import { inject, Injectable, signal } from '@angular/core';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  DocumentData,
  DocumentReference,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Transaction,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { Chat, ChatDocument } from '../models/chat.model';

const TEST_CHANNEL_ID = 'entwicklerteam';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly firebase = inject(FirebaseService);
  private readonly chatsState = signal<Chat[]>([]);
  private readonly activeChatIdState = signal<string | null>(null);
  private unsubscribeFromChats?: Unsubscribe;
  private connectionVersion = 0;

  readonly chats = this.chatsState.asReadonly();
  readonly activeChatId = this.activeChatIdState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  async connect(userId: string): Promise<void> {
    this.disconnect();
    const connectionVersion = this.connectionVersion;
    this.startLoading();

    try {
      await this.ensureTestChannelMembership(userId);
      this.finishConnection(userId, connectionVersion);
    } catch (error) {
      this.failConnection(error, connectionVersion);
    }
  }

  private startLoading(): void {
    this.loading.set(true);
    this.error.set('');
  }

  private finishConnection(userId: string, connectionVersion: number): void {
    if (connectionVersion !== this.connectionVersion) {
      return;
    }
    this.listenToUserChats(userId);
  }

  private failConnection(error: unknown, connectionVersion: number): void {
    if (connectionVersion !== this.connectionVersion) {
      return;
    }
    this.error.set(this.resolveErrorMessage(error));
    this.loading.set(false);
  }

  disconnect(): void {
    this.connectionVersion += 1;
    this.unsubscribeFromChats?.();
    this.unsubscribeFromChats = undefined;
    this.chatsState.set([]);
    this.activeChatIdState.set(null);
    this.loading.set(false);
  }

  selectChat(chatId: string): void {
    if (this.chatsState().some(({ id }) => id === chatId)) {
      this.activeChatIdState.set(chatId);
    }
  }

  // Checkt das kein Channel doppelt angelegt werden kann.
  channelNameExists(name: string, exceptId?: string): boolean {
    const normalized = name.trim().toLowerCase();

    return this.chatsState().some(
      (chat) =>
        chat.type === 'channel' &&
        chat.id !== exceptId &&
        chat.name.trim().toLowerCase() === normalized,
    );
  }

  /** Legt den Channel an und macht ihn zum aktiven Chat. Gibt die neue Dokument-ID zurueck. */
  async createChannel(name: string, description: string, userId: string): Promise<string> {
    const chatsRef = collection(this.firebase.firestore, 'chats');
    const channelRef = await addDoc(chatsRef, {
      type: 'channel',
      name: name.trim(),
      description: description.trim(),
      createdBy: userId,
      memberIds: [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.activeChatIdState.set(channelRef.id);
    return channelRef.id;
  }

  async updateChannel(
    chatId: string,
    changes: { name?: string; description?: string },
  ): Promise<void> {
    await updateDoc(doc(this.firebase.firestore, 'chats', chatId), {
      ...changes,
      updatedAt: serverTimestamp(),
    });
  }

  async addMembers(chatId: string, userIds: string[]): Promise<void> {
    const memberIds = [...new Set(userIds.filter(Boolean))];

    if (memberIds.length === 0) {
      return;
    }

    await updateDoc(doc(this.firebase.firestore, 'chats', chatId), {
      memberIds: arrayUnion(...memberIds),
      updatedAt: serverTimestamp(),
    });
  }

  private listenToUserChats(userId: string): void {
    const chatsQuery = this.createUserChatsQuery(userId);
    this.unsubscribeFromChats = onSnapshot(
      chatsQuery,
      (snapshot) => this.handleChatsSnapshot(snapshot),
      (error) => this.handleListenError(error),
    );
  }

  private createUserChatsQuery(userId: string) {
    return query(
      collection(this.firebase.firestore, 'chats'),
      where('memberIds', 'array-contains', userId),
    );
  }

  private handleChatsSnapshot(snapshot: QuerySnapshot<DocumentData>): void {
    const chats = snapshot.docs.map((chatSnapshot) => this.mapChat(chatSnapshot));
    chats.sort((first, second) => this.toMillis(second.updatedAt) - this.toMillis(first.updatedAt));
    this.chatsState.set(chats);
    this.ensureActiveChat(chats);
    this.loading.set(false);
  }

  private handleListenError(error: unknown): void {
    this.error.set(this.resolveErrorMessage(error));
    this.loading.set(false);
  }

  private async ensureTestChannelMembership(userId: string): Promise<void> {
    const channelRef = doc(this.firebase.firestore, 'chats', TEST_CHANNEL_ID);
    await runTransaction(this.firebase.firestore, (transaction) =>
      this.updateTestChannel(transaction, channelRef, userId),
    );
  }

  private async updateTestChannel(
    transaction: Transaction,
    channelRef: DocumentReference<DocumentData>,
    userId: string,
  ): Promise<void> {
    const snapshot = await transaction.get(channelRef);
    if (!snapshot.exists()) {
      transaction.set(channelRef, this.createTestChannel(userId));
      return;
    }
    this.addMemberIfMissing(transaction, channelRef, snapshot.data()['memberIds'], userId);
  }

  private createTestChannel(userId: string) {
    return {
      type: 'channel',
      name: 'Entwicklerteam',
      description: 'Austausch im Entwicklerteam',
      createdBy: userId,
      memberIds: [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private addMemberIfMissing(
    transaction: Transaction,
    channelRef: DocumentReference<DocumentData>,
    memberIds: unknown,
    userId: string,
  ): void {
    if (Array.isArray(memberIds) && memberIds.includes(userId)) {
      return;
    }
    transaction.update(channelRef, {
      memberIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  }

  private mapChat(snapshot: QueryDocumentSnapshot<DocumentData>): Chat {
    const data = snapshot.data() as Partial<ChatDocument>;

    return {
      id: snapshot.id,
      type: data.type === 'direct' ? 'direct' : 'channel',
      name: data.name || 'Unbenannter Chat',
      description: data.description || '',
      createdBy: data.createdBy || '',
      memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
    };
  }

  private ensureActiveChat(chats: Chat[]): void {
    const activeChatStillExists = chats.some(({ id }) => id === this.activeChatIdState());

    if (!activeChatStillExists) {
      this.activeChatIdState.set(chats[0]?.id || null);
    }
  }

  private toMillis(timestamp: Timestamp | null): number {
    return timestamp?.toMillis() || 0;
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Die Chats konnten nicht aus Firebase geladen werden.';
  }
}
