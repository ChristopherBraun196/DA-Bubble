import { inject, Injectable, signal } from '@angular/core';
import {
  collection,
  DocumentData,
  onSnapshot,
  query,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { Chat, ChatDocument } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
/** Loads public channels and only those private chats the user belongs to. */
export class ChatDirectoryService {
  private readonly firebase = inject(FirebaseService);
  private readonly chatsState = signal<Chat[]>([]);
  private readonly confirmedChatIdsState = signal<Set<string>>(new Set());
  private readonly subscriptions: Unsubscribe[] = [];
  private availableChannels: Chat[] = [];
  private memberChats: Chat[] = [];
  private channelsLoaded = false;
  private membershipsLoaded = false;

  readonly chats = this.chatsState.asReadonly();
  readonly confirmedChatIds = this.confirmedChatIdsState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  /** Starts both chat listeners for the signed-in user. */
  connect(userId: string): void {
    this.disconnect();
    this.loading.set(true);
    const chatsRef = collection(this.firebase.firestore, 'chats');
    this.listenToChannels(query(chatsRef, where('type', '==', 'channel')));
    this.listenToMemberships(query(chatsRef, where('memberIds', 'array-contains', userId)));
  }

  /** Stops all listeners and clears their stored results. */
  disconnect(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.length = 0;
    this.availableChannels = [];
    this.memberChats = [];
    this.channelsLoaded = false;
    this.membershipsLoaded = false;
    this.chatsState.set([]);
    this.confirmedChatIdsState.set(new Set());
    this.loading.set(false);
    this.error.set('');
  }

  /** Replaces the message shared with the chat UI. */
  setError(message: string): void {
    this.error.set(message);
  }

  /** Subscribes to every public channel in the workspace. */
  private listenToChannels(channelsQuery: Query<DocumentData>): void {
    this.subscriptions.push(
      onSnapshot(
        channelsQuery,
        (snapshot) => this.handleChannelsSnapshot(snapshot),
        (error) => this.handleListenError(error),
      ),
    );
  }

  /** Subscribes to member chats so foreign direct messages stay private. */
  private listenToMemberships(membershipsQuery: Query<DocumentData>): void {
    this.subscriptions.push(
      onSnapshot(
        membershipsQuery,
        (snapshot) => this.handleMembershipsSnapshot(snapshot),
        (error) => this.handleListenError(error),
      ),
    );
  }

  /** Stores the latest public channel snapshot. */
  private handleChannelsSnapshot(snapshot: QuerySnapshot<DocumentData>): void {
    this.availableChannels = snapshot.docs.map((chatSnapshot) => this.mapChat(chatSnapshot));
    this.channelsLoaded = true;
    this.publishChats();
  }

  /** Stores member chats and remembers which writes the server confirmed. */
  private handleMembershipsSnapshot(snapshot: QuerySnapshot<DocumentData>): void {
    this.memberChats = snapshot.docs.map((chatSnapshot) => this.mapChat(chatSnapshot));
    const confirmed = snapshot.docs.filter(({ metadata }) => !metadata.hasPendingWrites);
    this.confirmedChatIdsState.set(new Set(confirmed.map(({ id }) => id)));
    this.membershipsLoaded = true;
    this.publishChats();
  }

  /** Merges both snapshots without duplicating joined channels. */
  private publishChats(): void {
    const uniqueChats = new Map<string, Chat>();
    [...this.availableChannels, ...this.memberChats].forEach((chat) =>
      uniqueChats.set(chat.id, chat),
    );
    const chats = [...uniqueChats.values()].sort(
      (first, second) => this.toMillis(second.updatedAt) - this.toMillis(first.updatedAt),
    );
    this.chatsState.set(chats);
    this.loading.set(!(this.channelsLoaded && this.membershipsLoaded));
  }

  /** Converts a Firestore document into the app's chat model. */
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

  /** Reports whether a chat already carries messages. */
  private hasMessages(data: Partial<ChatDocument>): boolean {
    if (data.hasMessages === true) return true;
    if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) {
      return false;
    }
    return data.updatedAt.toMillis() > data.createdAt.toMillis();
  }

  /** Converts a nullable timestamp for newest-first sorting. */
  private toMillis(timestamp: Timestamp | null): number {
    return timestamp?.toMillis() || 0;
  }

  /** Surfaces a listener failure as a readable message. */
  private handleListenError(error: unknown): void {
    this.error.set(
      error instanceof Error
        ? error.message
        : 'Die Chats konnten nicht aus Firebase geladen werden.',
    );
    this.loading.set(false);
  }
}
