import { inject, Injectable, signal } from '@angular/core';
import {
  collection,
  documentId,
  DocumentData,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { AppUser } from '../models/user.model';

const MEMBER_QUERY_LIMIT = 30;

interface MemberConnection {
  memberIds: string[];
  version: number;
  chunkMembers: Map<number, AppUser[]>;
  pendingChunks: Set<number>;
}

@Injectable({ providedIn: 'root' })
export class ChannelMemberService {
  private readonly firebase = inject(FirebaseService);
  private readonly membersState = signal<AppUser[]>([]);
  private unsubscribes: Unsubscribe[] = [];
  private connectionKey = '';
  private connectionVersion = 0;

  readonly members = this.membersState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  connect(memberIds: string[]): void {
    const uniqueMemberIds = [...new Set(memberIds.filter(Boolean))];
    const connectionKey = uniqueMemberIds.join('|');
    if (this.hasActiveConnection(connectionKey)) {
      return;
    }
    this.resetConnection(connectionKey);
    if (uniqueMemberIds.length === 0) {
      return;
    }
    this.listenToMemberChunks(uniqueMemberIds);
  }

  private hasActiveConnection(connectionKey: string): boolean {
    return connectionKey === this.connectionKey && this.unsubscribes.length > 0;
  }

  private resetConnection(connectionKey: string): void {
    this.disconnect();
    this.connectionKey = connectionKey;
  }

  private listenToMemberChunks(memberIds: string[]): void {
    const chunks = this.createChunks(memberIds);
    const connection = this.createMemberConnection(memberIds, chunks.length);
    this.loading.set(true);
    chunks.forEach((chunk, index) => this.listenToChunk(chunk, index, connection));
  }

  private createMemberConnection(memberIds: string[], chunkCount: number): MemberConnection {
    return {
      memberIds,
      version: this.connectionVersion,
      chunkMembers: new Map<number, AppUser[]>(),
      pendingChunks: new Set(Array.from({ length: chunkCount }, (_, index) => index)),
    };
  }

  private listenToChunk(memberIds: string[], index: number, connection: MemberConnection): void {
    const membersQuery = this.createMembersQuery(memberIds);
    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => this.handleMemberSnapshot(snapshot, index, connection),
      (error) => this.handleListenError(error, connection.version),
    );
    this.unsubscribes.push(unsubscribe);
  }

  private createMembersQuery(memberIds: string[]) {
    return query(
      collection(this.firebase.firestore, 'users'),
      where(documentId(), 'in', memberIds),
    );
  }

  private handleMemberSnapshot(
    snapshot: QuerySnapshot<DocumentData>,
    index: number,
    connection: MemberConnection,
  ): void {
    if (!this.isActiveConnection(connection.version)) {
      return;
    }
    this.storeChunkMembers(snapshot, index, connection);
    connection.pendingChunks.delete(index);
    this.updateMembers(connection.memberIds, connection.chunkMembers);
    this.loading.set(connection.pendingChunks.size > 0);
  }

  private storeChunkMembers(
    snapshot: QuerySnapshot<DocumentData>,
    index: number,
    connection: MemberConnection,
  ): void {
    const members = snapshot.docs.map((userSnapshot) => this.mapUser(userSnapshot));
    connection.chunkMembers.set(index, members);
  }

  private handleListenError(error: unknown, connectionVersion: number): void {
    if (!this.isActiveConnection(connectionVersion)) {
      return;
    }
    this.error.set(this.resolveErrorMessage(error));
    this.loading.set(false);
  }

  private isActiveConnection(connectionVersion: number): boolean {
    return connectionVersion === this.connectionVersion;
  }

  private createChunks(memberIds: string[]): string[][] {
    const chunks: string[][] = [];

    for (let index = 0; index < memberIds.length; index += MEMBER_QUERY_LIMIT) {
      chunks.push(memberIds.slice(index, index + MEMBER_QUERY_LIMIT));
    }

    return chunks;
  }

  disconnect(): void {
    this.connectionVersion += 1;
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = [];
    this.connectionKey = '';
    this.membersState.set([]);
    this.loading.set(false);
    this.error.set('');
  }

  private updateMembers(memberIds: string[], chunkMembers: Map<number, AppUser[]>): void {
    const memberOrder = new Map(memberIds.map((id, index) => [id, index]));
    const members = [...chunkMembers.values()]
      .flat()
      .sort(
        (first, second) =>
          (memberOrder.get(first.uid) ?? Number.MAX_SAFE_INTEGER) -
          (memberOrder.get(second.uid) ?? Number.MAX_SAFE_INTEGER),
      );

    this.membersState.set(members);
  }

  private mapUser(snapshot: QueryDocumentSnapshot<DocumentData>): AppUser {
    const data = snapshot.data() as Partial<AppUser>;
    const displayName = this.resolveDisplayName(data);
    return {
      uid: snapshot.id,
      displayName,
      nameNormalized: data.nameNormalized || displayName.toLocaleLowerCase('de-DE'),
      email: data.email || null,
      photoURL: data.photoURL || '/img/Profile_Guest.png',
      isAnonymous: Boolean(data.isAnonymous),
      onboardingCompleted: Boolean(data.onboardingCompleted),
      ...this.mapUserTimestamps(data),
    };
  }

  private resolveDisplayName(data: Partial<AppUser>): string {
    return data.displayName || data.email?.split('@')[0] || 'Unbekannter Nutzer';
  }

  private mapUserTimestamps(data: Partial<AppUser>) {
    return {
      createdAt: this.toTimestamp(data.createdAt),
      updatedAt: this.toTimestamp(data.updatedAt),
      lastSeenAt: this.toTimestamp(data.lastSeenAt),
    };
  }

  private toTimestamp(value: Timestamp | null | undefined): Timestamp | null {
    return value instanceof Timestamp ? value : null;
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Die Channel-Mitglieder konnten nicht aus Firebase geladen werden.';
  }
}
