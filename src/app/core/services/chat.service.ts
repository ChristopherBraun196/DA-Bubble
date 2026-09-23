import { inject, Injectable, signal } from '@angular/core';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { Chat, ChatDocument } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly firebase = inject(FirebaseService);
  private readonly chatsState = signal<Chat[]>([]);
  private readonly activeChatIdState = signal<string | null>(null);
  private unsubscribeFromChats?: Unsubscribe;

  readonly chats = this.chatsState.asReadonly();
  readonly activeChatId = this.activeChatIdState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  connect(userId: string): void {
    this.disconnect();
    this.startLoading();
    this.listenToUserChats(userId);
  }

  private startLoading(): void {
    this.loading.set(true);
    this.error.set('');
  }

  disconnect(): void {
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
      hasMessages: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.activeChatIdState.set(channelRef.id);
    return channelRef.id;
  }

  async ensureDirectChat(userId: string, otherUserId: string): Promise<string> {
    const memberIds = [...new Set([userId, otherUserId])].sort();
    const chatId = this.getDirectChatId(userId, otherUserId);
    const chatRef = doc(this.firebase.firestore, 'chats', chatId);
    const snapshot = await getDoc(chatRef);

    if (!snapshot.exists()) {
      await setDoc(chatRef, this.createDirectChatDocument(memberIds, userId));
    }
    this.activeChatIdState.set(chatId);
    return chatId;
  }

  getDirectChatId(userId: string, otherUserId: string): string {
    return `direct_${[...new Set([userId, otherUserId])].sort().join('_')}`;
  }

  async directChatExists(chatId: string): Promise<boolean> {
    return (await getDoc(doc(this.firebase.firestore, 'chats', chatId))).exists();
  }

  private createDirectChatDocument(memberIds: string[], userId: string) {
    return {
      type: 'direct',
      name: 'Direktnachricht',
      description: '',
      createdBy: userId,
      memberIds,
      hasMessages: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
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

  async leaveChannel(chatId: string, userId: string): Promise<void> {
    await updateDoc(doc(this.firebase.firestore, 'chats', chatId), {
      memberIds: arrayRemove(userId),
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

  private mapChat(snapshot: QueryDocumentSnapshot<DocumentData>): Chat {
    const data = snapshot.data() as Partial<ChatDocument>;

    return {
      id: snapshot.id,
      type: data.type === 'direct' ? 'direct' : 'channel',
      name: data.name || 'Unbenannter Chat',
      description: data.description || '',
      createdBy: data.createdBy || '',
      memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
      hasMessages: this.hasMessages(data),
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
    };
  }

  private hasMessages(data: Partial<ChatDocument>): boolean {
    if (data.hasMessages === true) return true;
    if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) {
      return false;
    }
    return data.updatedAt.toMillis() > data.createdAt.toMillis();
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
