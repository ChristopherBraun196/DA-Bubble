import { inject, Injectable, signal } from '@angular/core';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  runTransaction,
  serverTimestamp,
  startAt,
  Timestamp,
  Transaction,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { mapChatMessage, readReactions } from '../models/message.mapper';
import { ChatMessage } from '../models/message.model';
import { MessageReaction, ReactionEmoji, ReactionUser } from '../models/reaction.model';
import { AuthService } from './auth.service';

const MESSAGE_LIMIT = 50;

@Injectable({ providedIn: 'root' })
/**
 * Streams and writes the messages of a single chat.
 *
 * @remarks
 * Only one chat is subscribed at a time; switching chats replaces the
 * subscription. Thread replies live in the same collection and are separated
 * by their `threadParentId`.
 */
export class MessageService {
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);
  private readonly messagesState = signal<ChatMessage[]>([]);
  private unsubscribeFromMessages?: Unsubscribe;
  private connectedChatId: string | null = null;
  private historyStart: Timestamp | null = null;
  private connectionVersion = 0;

  readonly messages = this.messagesState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  /**
   * Subscribes to the messages of a chat.
   *
   * @param chatId - Id of the chat to follow.
   * @param since - Optional lower bound, used to hide history before a user joined.
   */
  connect(chatId: string, since: Timestamp | null = null): void {
    if (
      chatId === this.connectedChatId &&
      this.historyStart === since &&
      this.unsubscribeFromMessages
    ) {
      return;
    }
    this.prepareConnection(chatId);
    this.historyStart = since;
    this.subscribeToMessages(chatId);
  }

  /** Tears down a previous subscription and resets the message state. */
  private prepareConnection(chatId: string): void {
    this.disconnect();
    this.connectedChatId = chatId;
    this.loading.set(true);
    this.error.set('');
  }

  /**
   * Builds the query for a chat's top-level messages.
   *
   * @param chatId - Id of the chat.
   * @returns The Firestore query, ordered chronologically.
   */
  private createMessagesQuery(chatId: string) {
    return query(
      collection(this.firebase.firestore, 'chats', chatId, 'messages'),
      where('threadParentId', '==', null),
      orderBy('createdAt', 'asc'),
      this.historyStart ? startAt(this.historyStart) : limitToLast(MESSAGE_LIMIT),
    );
  }

  /** Opens the live subscription for the given chat. */
  private subscribeToMessages(chatId: string): void {
    const messagesQuery = this.createMessagesQuery(chatId);
    const version = this.connectionVersion;
    this.unsubscribeFromMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        if (version === this.connectionVersion) this.handleMessagesSnapshot(snapshot);
      },
      (error) => {
        if (version === this.connectionVersion) this.handleListenError(error);
      },
    );
  }

  /** Maps an incoming snapshot into the messages signal. */
  private handleMessagesSnapshot(snapshot: QuerySnapshot<DocumentData>): void {
    const messages = snapshot.docs.map((messageSnapshot) => this.mapMessage(messageSnapshot));
    this.messagesState.set(messages);
    this.loading.set(false);
  }

  /** Surfaces a listener failure as a readable error message. */
  private handleListenError(error: unknown): void {
    this.error.set(this.resolveErrorMessage(error));
    this.loading.set(false);
  }

  /** Stops the listener and clears the cached messages. */
  disconnect(): void {
    this.connectionVersion++;
    this.historyStart = null;
    this.unsubscribeFromMessages?.();
    this.unsubscribeFromMessages = undefined;
    this.connectedChatId = null;
    this.messagesState.set([]);
    this.loading.set(false);
    this.error.set('');
  }

  /**
   * Sends a message into a chat.
   *
   * @param chatId - Id of the target chat.
   * @param text - The message body; blank input is ignored.
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    const user = this.auth.currentUser();
    const messageText = text.trim();
    if (!user || !messageText) {
      return;
    }
    await this.persistMessage(chatId, messageText, user);
  }

  /** Legt eine Thread-Antwort an und zaehlt sie an der Ursprungsnachricht mit. */
  /**
   * Sends a reply inside a thread and updates the parent's reply counter.
   *
   * @param chatId - Id of the chat the thread belongs to.
   * @param parentId - Id of the message being replied to.
   * @param text - The reply body; blank input is ignored.
   */
  async sendReply(chatId: string, parentId: string, text: string): Promise<void> {
    const user = this.auth.currentUser();
    const messageText = text.trim();
    if (!user || !messageText) {
      return;
    }
    await this.persistReply(chatId, parentId, messageText, user);
  }

  /**
   * Rewrites the text of an existing message and marks it as edited.
   *
   * @param chatId - Id of the chat.
   * @param messageId - Id of the message to change.
   * @param text - The new body; blank input is ignored.
   */
  async updateMessage(chatId: string, messageId: string, text: string): Promise<void> {
    const messageText = text.trim();

    if (!messageText) {
      return;
    }

    const messageRef = doc(this.firebase.firestore, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, { text: messageText, editedAt: serverTimestamp() });
  }

  /**
   * Adds the current user's reaction, or removes it when already present.
   *
   * @param chatId - Id of the chat.
   * @param messageId - Id of the message being reacted to.
   * @param emoji - The emoji to toggle.
   *
   * @remarks
   * Runs inside a transaction so simultaneous reactions cannot overwrite
   * each other.
   */
  async toggleReaction(chatId: string, messageId: string, emoji: ReactionEmoji): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }
    const messageRef = doc(this.firebase.firestore, 'chats', chatId, 'messages', messageId);
    const reactingUser = { id: user.uid, name: this.auth.displayName() };
    await runTransaction(this.firebase.firestore, (transaction) =>
      this.updateReaction(transaction, messageRef, emoji, reactingUser),
    );
  }

  /**
   * Writes a message and marks the chat as no longer empty.
   *
   * @param chatId - Id of the target chat.
   * @param text - The message body.
   * @param user - The author.
   */
  private async persistMessage(chatId: string, text: string, user: User): Promise<void> {
    const chatRef = doc(this.firebase.firestore, 'chats', chatId);
    const messageRef = doc(collection(chatRef, 'messages'));
    const batch = writeBatch(this.firebase.firestore);
    batch.set(messageRef, this.createMessageDocument(user, text));
    batch.update(chatRef, { hasMessages: true, updatedAt: serverTimestamp() });
    await batch.commit();
  }

  /**
   * Writes a thread reply and raises the parent's reply counter in one batch.
   *
   * @param chatId - Id of the chat the thread belongs to.
   * @param parentId - Id of the message being replied to.
   * @param text - The reply body.
   * @param user - The author.
   */
  private async persistReply(
    chatId: string,
    parentId: string,
    text: string,
    user: User,
  ): Promise<void> {
    const messagesRef = collection(this.firebase.firestore, 'chats', chatId, 'messages');
    const batch = writeBatch(this.firebase.firestore);
    batch.set(doc(messagesRef), this.createMessageDocument(user, text, parentId));
    batch.update(doc(messagesRef, parentId), {
      replyCount: increment(1),
      lastReplyAt: serverTimestamp(),
    });
    await batch.commit();
  }

  /**
   * Assembles the payload for a new message.
   *
   * @param user - The author.
   * @param text - The message body.
   * @param threadParentId - Parent message id for thread replies.
   * @returns The document to store.
   */
  private createMessageDocument(user: User, text: string, threadParentId: string | null = null) {
    return {
      authorId: user.uid,
      authorName: this.auth.displayName(),
      authorPhotoURL: this.auth.photoURL(),
      text,
      threadParentId,
      createdAt: serverTimestamp(),
      editedAt: null,
      reactions: [],
      replyCount: 0,
      lastReplyAt: null,
    };
  }

  /**
   * Converts a Firestore document into a {@link ChatMessage}.
   *
   * @param snapshot - The message document.
   * @returns The mapped message.
   */
  private mapMessage(snapshot: QueryDocumentSnapshot<DocumentData>): ChatMessage {
    return mapChatMessage(snapshot.id, snapshot.data());
  }

  /**
   * Computes the reaction list after toggling one user's entry.
   *
   * @returns The updated reactions, with empty ones dropped.
   */
  private toggleUser(
    reactions: MessageReaction[],
    emoji: ReactionEmoji,
    user: ReactionUser,
  ): MessageReaction[] {
    const current = reactions.find((reaction) => reaction.emoji === emoji);
    if (!current) {
      return [...reactions, this.createReaction(emoji, user)];
    }
    const users = this.toggleReactionUser(current.users, user);
    return reactions.flatMap((reaction) =>
      reaction.emoji !== emoji ? [reaction] : users.length ? [{ emoji, users }] : [],
    );
  }

  /**
   * Applies a reaction toggle inside a running transaction.
   *
   * @param transaction - The transaction to write through.
   * @param messageRef - Reference to the message being reacted to.
   * @param emoji - The emoji to toggle.
   * @param user - The reacting user.
   */
  private async updateReaction(
    transaction: Transaction,
    messageRef: DocumentReference<DocumentData>,
    emoji: ReactionEmoji,
    user: ReactionUser,
  ): Promise<void> {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists()) {
      return;
    }
    const reactions = readReactions(snapshot.data()['reactions']);
    transaction.update(messageRef, { reactions: this.toggleUser(reactions, emoji, user) });
  }

  /**
   * Adds or removes a user within a single reaction.
   *
   * @param users - The users who reacted so far.
   * @param user - The user toggling their reaction.
   * @returns The updated user list.
   */
  private toggleReactionUser(users: ReactionUser[], user: ReactionUser): ReactionUser[] {
    return users.some(({ id }) => id === user.id)
      ? users.filter(({ id }) => id !== user.id)
      : [...users, user];
  }

  /**
   * Creates a reaction carrying its first user.
   *
   * @param emoji - The chosen emoji.
   * @param user - The first user to react.
   * @returns The new reaction.
   */
  private createReaction(emoji: ReactionEmoji, user: ReactionUser): MessageReaction {
    return { emoji, users: [user] };
  }

  /**
   * Maps an unknown failure onto a message shown in the UI.
   *
   * @param error - The caught error.
   * @returns A readable German message.
   */
  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Die Nachrichten konnten nicht aus Firebase geladen werden.';
  }
}
