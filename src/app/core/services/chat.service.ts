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

/** Fixed id of the channel every user joins automatically. */
const GENERAL_CHANNEL_ID = 'allgemein';

@Injectable({ providedIn: 'root' })
/**
 * Keeps the signed-in user's chats in sync and provides channel operations.
 *
 * @remarks
 * Holds a single live subscription on all chats the user is a member of.
 * Channels and direct messages share the same collection, so both are served
 * from the {@link ChatService.chats} signal.
 */
export class ChatService {
  private readonly firebase = inject(FirebaseService);
  private readonly chatsState = signal<Chat[]>([]);
  private readonly activeChatIdState = signal<string | null>(null);
  private unsubscribeFromChats?: Unsubscribe;

  readonly chats = this.chatsState.asReadonly();
  readonly activeChatId = this.activeChatIdState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  /**
   * Starts listening to all chats the user belongs to.
   *
   * @param userId - The signed-in user's id.
   */
  connect(userId: string): void {
    this.disconnect();
    this.startLoading();
    this.listenToUserChats(userId);
  }

  /** Resets error state and marks the chat list as loading. */
  private startLoading(): void {
    this.loading.set(true);
    this.error.set('');
  }

  /** Stops the listener and clears the cached chats, typically on sign-out. */
  disconnect(): void {
    this.unsubscribeFromChats?.();
    this.unsubscribeFromChats = undefined;
    this.chatsState.set([]);
    this.activeChatIdState.set(null);
    this.loading.set(false);
  }

  /**
   * Marks a chat as the active one shown in the main view.
   *
   * @param chatId - Id of the chat to open; ignored when unknown.
   */
  selectChat(chatId: string): void {
    if (this.chatsState().some(({ id }) => id === chatId)) {
      this.activeChatIdState.set(chatId);
    }
  }

  /**
   * Checks whether a channel with the given name already exists.
   *
   * @param name - The name to test, compared without regard to case.
   * @param exceptId - Channel to exclude, so renaming does not match itself.
   * @returns True when another channel already carries that name.
   *
   * @remarks
   * Only considers chats the user is a member of, since no others are loaded.
   */
  channelNameExists(name: string, exceptId?: string): boolean {
    const normalized = name.trim().toLowerCase();

    return this.chatsState().some(
      (chat) =>
        chat.type === 'channel' &&
        chat.id !== exceptId &&
        chat.name.trim().toLowerCase() === normalized,
    );
  }

  /**
   * Adds the user to the shared "Allgemein" channel, creating it on first use.
   *
   * @param userId - The signed-in user's id.
   */
  async joinGeneralChannel(userId: string): Promise<void> {
    const channelRef = doc(this.firebase.firestore, 'chats', GENERAL_CHANNEL_ID);
    const snapshot = await getDoc(channelRef);

    if (!snapshot.exists()) {
      await setDoc(channelRef, this.createGeneralChannelDocument(userId));
    } else if (!snapshot.data()['memberIds']?.includes(userId)) {
      await updateDoc(channelRef, { memberIds: arrayUnion(userId), updatedAt: serverTimestamp() });
    }
  }

  /**
   * Assembles the "Allgemein" channel for its very first visitor.
   *
   * @param userId - The user creating it, who becomes the first member.
   * @returns The document to store.
   */
  private createGeneralChannelDocument(userId: string): ChatDocument {
    return {
      type: 'channel',
      name: 'Allgemein',
      description: 'Der Channel für alle – hier landet jeder automatisch.',
      createdBy: userId,
      memberIds: [userId],
      hasMessages: false,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
  }

  /**
   * Creates a channel and makes it the active chat.
   *
   * @param name - The channel name.
   * @param description - Optional channel description.
   * @param userId - Creator, who becomes the first member.
   * @returns The id of the new channel document.
   */
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

  /**
   * Returns the direct chat between two users, creating it when missing.
   *
   * @param userId - The signed-in user.
   * @param otherUserId - The conversation partner.
   * @returns The id of the direct chat.
   */
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

  /**
   * Builds the deterministic id of a direct chat.
   *
   * @param userId - One participant.
   * @param otherUserId - The other participant.
   * @returns A stable id, identical no matter which side asks.
   */
  getDirectChatId(userId: string, otherUserId: string): string {
    return `direct_${[...new Set([userId, otherUserId])].sort().join('_')}`;
  }

  /**
   * Checks whether a direct chat document has already been written.
   *
   * @param chatId - The direct chat id.
   * @returns True when the document exists.
   */
  async directChatExists(chatId: string): Promise<boolean> {
    return (await getDoc(doc(this.firebase.firestore, 'chats', chatId))).exists();
  }

  /**
   * Assembles the payload for a new direct chat.
   *
   * @param memberIds - Both participants.
   * @param userId - The user initiating the conversation.
   * @returns The document to store.
   */
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

  /**
   * Updates a channel's name or description.
   *
   * @param chatId - Id of the channel.
   * @param changes - The fields to overwrite.
   */
  async updateChannel(
    chatId: string,
    changes: { name?: string; description?: string },
  ): Promise<void> {
    await updateDoc(doc(this.firebase.firestore, 'chats', chatId), {
      ...changes,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Adds users to a chat, skipping duplicates.
   *
   * @param chatId - Id of the chat.
   * @param userIds - Users to add; blank entries are ignored.
   */
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

  /**
   * Removes a user from a channel.
   *
   * @param chatId - Id of the channel.
   * @param userId - The member leaving.
   */
  async leaveChannel(chatId: string, userId: string): Promise<void> {
    await updateDoc(doc(this.firebase.firestore, 'chats', chatId), {
      memberIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
  }

  /** Opens the live subscription on the user's chats. */
  private listenToUserChats(userId: string): void {
    const chatsQuery = this.createUserChatsQuery(userId);
    this.unsubscribeFromChats = onSnapshot(
      chatsQuery,
      (snapshot) => this.handleChatsSnapshot(snapshot),
      (error) => this.handleListenError(error),
    );
  }

  /**
   * Builds the query for all chats containing the user.
   *
   * @param userId - The signed-in user's id.
   * @returns The Firestore query.
   */
  private createUserChatsQuery(userId: string) {
    return query(
      collection(this.firebase.firestore, 'chats'),
      where('memberIds', 'array-contains', userId),
    );
  }

  /** Maps and sorts an incoming snapshot into the chats signal. */
  private handleChatsSnapshot(snapshot: QuerySnapshot<DocumentData>): void {
    const chats = snapshot.docs.map((chatSnapshot) => this.mapChat(chatSnapshot));
    chats.sort((first, second) => this.toMillis(second.updatedAt) - this.toMillis(first.updatedAt));
    this.chatsState.set(chats);
    this.ensureActiveChat(chats, this.confirmedChatIds(snapshot));
    this.loading.set(false);
  }

  /**
   * Collects the chats the server has acknowledged.
   *
   * @param snapshot - The incoming chat snapshot.
   * @returns Ids of all chats that are not a pending local write.
   *
   * @remarks
   * Firestore reports a new document locally before the server has stored it.
   * The security rules only see the stored state, so anything still pending
   * must not be opened yet.
   */
  private confirmedChatIds(snapshot: QuerySnapshot<DocumentData>): Set<string> {
    const confirmed = snapshot.docs.filter(({ metadata }) => !metadata.hasPendingWrites);

    return new Set(confirmed.map(({ id }) => id));
  }

  /** Surfaces a listener failure as a readable error message. */
  private handleListenError(error: unknown): void {
    this.error.set(this.resolveErrorMessage(error));
    this.loading.set(false);
  }

  /**
   * Converts a Firestore document into a {@link Chat}.
   *
   * @param snapshot - The chat document.
   * @returns The mapped chat with defaults for missing fields.
   */
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

  /** Reports whether a chat already carries messages, defaulting to true for channels. */
  private hasMessages(data: Partial<ChatDocument>): boolean {
    if (data.hasMessages === true) return true;
    if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) {
      return false;
    }
    return data.updatedAt.toMillis() > data.createdAt.toMillis();
  }

  /**
   * Falls back to the first available chat when the active one disappeared.
   *
   * @param chats - All chats from the current snapshot.
   * @param confirmedIds - Chats the server already knows, see
   * {@link ChatService.confirmedChatIds}.
   */
  private ensureActiveChat(chats: Chat[], confirmedIds: Set<string>): void {
    const activeChatStillExists = chats.some(({ id }) => id === this.activeChatIdState());

    if (activeChatStillExists) {
      return;
    }

    const fallback = chats.find(({ id }) => confirmedIds.has(id));
    this.activeChatIdState.set(fallback?.id || null);
  }

  /**
   * Converts a timestamp into milliseconds for sorting.
   *
   * @param timestamp - The value to convert; `null` counts as zero.
   * @returns Milliseconds since the epoch.
   */
  private toMillis(timestamp: Timestamp | null): number {
    return timestamp?.toMillis() || 0;
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
      : 'Die Chats konnten nicht aus Firebase geladen werden.';
  }
}
