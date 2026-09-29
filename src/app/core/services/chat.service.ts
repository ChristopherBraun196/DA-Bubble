import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { Chat, ChatDocument } from '../models/chat.model';
import { ChatDirectoryService } from './chat-directory.service';

/** Fixed id of the channel every user joins automatically. */
const GENERAL_CHANNEL_ID = 'allgemein';

@Injectable({ providedIn: 'root' })
/**
 * Keeps the signed-in user's chats in sync and provides channel operations.
 *
 * @remarks
 * Holds live subscriptions on all public channels and on the chats the user
 * belongs to. Both are merged into the {@link ChatService.chats} signal.
 */
export class ChatService {
  private readonly firebase = inject(FirebaseService);
  private readonly directory = inject(ChatDirectoryService);
  private readonly activeChatIdState = signal<string | null>(null);
  private connectedUserId = '';

  readonly chats = this.directory.chats;
  readonly activeChatId = this.activeChatIdState.asReadonly();
  readonly loading = this.directory.loading;
  readonly error = this.directory.error;

  constructor() {
    effect(() => {
      const chats = this.chats();
      const confirmedIds = this.directory.confirmedChatIds();
      untracked(() => this.ensureActiveChat(chats, confirmedIds));
    });
  }

  /**
   * Starts listening to public channels and the chats the user belongs to.
   *
   * @param userId - The signed-in user's id.
   */
  connect(userId: string): void {
    this.disconnect();
    this.connectedUserId = userId;
    this.directory.connect(userId);
  }

  /** Stops the listener and clears the cached chats, typically on sign-out. */
  disconnect(): void {
    this.directory.disconnect();
    this.connectedUserId = '';
    this.activeChatIdState.set(null);
  }

  /**
   * Marks a chat as the active one shown in the main view.
   *
   * @param chatId - Id of the chat to open; ignored when unknown.
   * @returns True when the chat was opened successfully.
   */
  async selectChat(chatId: string): Promise<boolean> {
    const chat = this.chats().find(({ id }) => id === chatId);
    if (!chat) return false;

    try {
      if (chat.type === 'channel' && !chat.memberIds.includes(this.connectedUserId)) {
        await this.joinChannel(chatId, this.connectedUserId);
      }
      this.directory.setError('');
      this.activeChatIdState.set(chatId);
      return true;
    } catch {
      this.directory.setError('Der Channel konnte nicht geöffnet werden. Versuch es noch einmal.');
      return false;
    }
  }

  /** Adds the signed-in user to a public channel before its messages are opened. */
  private async joinChannel(chatId: string, userId: string): Promise<void> {
    if (!userId) throw new Error('No signed-in user');
    await updateDoc(doc(this.firebase.firestore, 'chats', chatId), {
      memberIds: arrayUnion(userId),
    });
  }

  /**
   * Checks whether a channel with the given name already exists.
   *
   * @param name - The name to test, compared without regard to case.
   * @param exceptId - Channel to exclude, so renaming does not match itself.
   * @returns True when another channel already carries that name.
   *
   * @remarks
   * All public channels are loaded, so the check covers the whole workspace.
   */
  channelNameExists(name: string, exceptId?: string): boolean {
    const normalized = name.trim().toLowerCase();

    return this.chats().some(
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

  /**
   * Falls back to the first available chat when the active one disappeared.
   *
   * @param chats - All chats from the current snapshot.
   * @param confirmedIds - Member chats the server has already acknowledged.
   */
  private ensureActiveChat(chats: Chat[], confirmedIds: Set<string>): void {
    const activeChatStillExists = chats.some(
      ({ id, type, memberIds }) =>
        id === this.activeChatIdState() &&
        (type === 'direct' || memberIds.includes(this.connectedUserId)),
    );

    if (activeChatStillExists) {
      return;
    }

    const fallback = chats.find(
      ({ id, type, memberIds }) =>
        confirmedIds.has(id) && (type === 'direct' || memberIds.includes(this.connectedUserId)),
    );
    this.activeChatIdState.set(fallback?.id || null);
  }
}
