import { inject, Injectable } from '@angular/core';
import {
  arrayRemove,
  collection,
  DocumentData,
  DocumentReference,
  getDocs,
  query,
  QuerySnapshot,
  serverTimestamp,
  where,
  writeBatch,
  WriteBatch,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';

@Injectable({ providedIn: 'root' })
/**
 * Cleans up after anonymous sessions.
 *
 * @remarks
 * Guest accounts are deleted on sign-out, so their memberships have to be
 * removed first — otherwise channels would keep pointing at users that no
 * longer exist.
 */
export class GuestMembershipService {
  private readonly firebase = inject(FirebaseService);

  /**
   * Removes a guest from every chat they joined.
   *
   * @param userId - The anonymous user's id.
   */
  async removeFromAllChats(userId: string): Promise<void> {
    const snapshot = await getDocs(this.createUserChatsQuery(userId));
    if (snapshot.empty) {
      return;
    }
    await this.removeMemberships(snapshot, userId);
  }

  /**
   * Builds the query for all chats containing the user.
   *
   * @param userId - The anonymous user's id.
   * @returns The Firestore query.
   */
  private createUserChatsQuery(userId: string) {
    return query(
      collection(this.firebase.firestore, 'chats'),
      where('memberIds', 'array-contains', userId),
    );
  }

  /**
   * Removes the user from every chat in the snapshot.
   *
   * @param snapshot - The chats the user is a member of.
   * @param userId - The anonymous user's id.
   */
  private async removeMemberships(
    snapshot: QuerySnapshot<DocumentData>,
    userId: string,
  ): Promise<void> {
    const batch = writeBatch(this.firebase.firestore);
    snapshot.docs.forEach(({ ref }) => this.removeMembership(batch, ref, userId));
    await batch.commit();
  }

  /** Removes the user from a single chat document. */
  private removeMembership(
    batch: WriteBatch,
    chatRef: DocumentReference<DocumentData>,
    userId: string,
  ): void {
    batch.update(chatRef, {
      memberIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
  }
}
