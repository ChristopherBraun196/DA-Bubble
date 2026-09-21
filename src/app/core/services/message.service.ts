import { inject, Injectable, signal } from '@angular/core';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  DocumentData,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { ChatMessage, ChatMessageDocument } from '../models/message.model';
import { AuthService } from './auth.service';

const MESSAGE_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);
  private readonly messagesState = signal<ChatMessage[]>([]);
  private unsubscribeFromMessages?: Unsubscribe;
  private connectedChatId: string | null = null;

  readonly messages = this.messagesState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  connect(chatId: string): void {
    if (chatId === this.connectedChatId && this.unsubscribeFromMessages) {
      return;
    }
    this.prepareConnection(chatId);
    this.subscribeToMessages(chatId);
  }

  private prepareConnection(chatId: string): void {
    this.disconnect();
    this.connectedChatId = chatId;
    this.loading.set(true);
    this.error.set('');
  }

  private createMessagesQuery(chatId: string) {
    return query(
      collection(this.firebase.firestore, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(MESSAGE_LIMIT),
    );
  }

  private subscribeToMessages(chatId: string): void {
    const messagesQuery = this.createMessagesQuery(chatId);
    this.unsubscribeFromMessages = onSnapshot(
      messagesQuery,
      (snapshot) => this.handleMessagesSnapshot(snapshot),
      (error) => this.handleListenError(error),
    );
  }

  private handleMessagesSnapshot(snapshot: QuerySnapshot<DocumentData>): void {
    const messages = snapshot.docs.map((messageSnapshot) => this.mapMessage(messageSnapshot));
    this.messagesState.set(messages);
    this.loading.set(false);
  }

  private handleListenError(error: unknown): void {
    this.error.set(this.resolveErrorMessage(error));
    this.loading.set(false);
  }

  disconnect(): void {
    this.unsubscribeFromMessages?.();
    this.unsubscribeFromMessages = undefined;
    this.connectedChatId = null;
    this.messagesState.set([]);
    this.loading.set(false);
    this.error.set('');
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    const user = this.auth.currentUser();
    const messageText = text.trim();
    if (!user || !messageText) {
      return;
    }
    await this.persistMessage(chatId, messageText, user);
  }

  async updateMessage(chatId: string, messageId: string, text: string): Promise<void> {
    const messageText = text.trim();

    if (!messageText) {
      return;
    }

    const messageRef = doc(this.firebase.firestore, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, { text: messageText, editedAt: serverTimestamp() });
  }

  private async persistMessage(chatId: string, text: string, user: User): Promise<void> {
    const chatRef = doc(this.firebase.firestore, 'chats', chatId);
    const messageRef = doc(collection(chatRef, 'messages'));
    const batch = writeBatch(this.firebase.firestore);
    batch.set(messageRef, this.createMessageDocument(user, text));
    batch.update(chatRef, { updatedAt: serverTimestamp() });
    await batch.commit();
  }

  private createMessageDocument(user: User, text: string) {
    return {
      authorId: user.uid,
      authorName: this.auth.displayName(),
      authorPhotoURL: this.auth.photoURL(),
      text,
      threadParentId: null,
      createdAt: serverTimestamp(),
      editedAt: null,
    };
  }

  private mapMessage(snapshot: QueryDocumentSnapshot<DocumentData>): ChatMessage {
    const data = snapshot.data() as Partial<ChatMessageDocument>;

    return {
      id: snapshot.id,
      authorId: data.authorId || '',
      authorName: data.authorName || 'Unbekannter Nutzer',
      authorPhotoURL: data.authorPhotoURL || '/img/Profile_Guest.png',
      text: data.text || '',
      threadParentId: data.threadParentId || null,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
      editedAt: data.editedAt instanceof Timestamp ? data.editedAt : null,
    };
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Die Nachrichten konnten nicht aus Firebase geladen werden.';
  }
}
