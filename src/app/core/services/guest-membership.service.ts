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
export class GuestMembershipService {
  private readonly firebase = inject(FirebaseService);

  async removeFromAllChats(userId: string): Promise<void> {
    const snapshot = await getDocs(this.createUserChatsQuery(userId));
    if (snapshot.empty) {
      return;
    }
    await this.removeMemberships(snapshot, userId);
  }

  private createUserChatsQuery(userId: string) {
    return query(
      collection(this.firebase.firestore, 'chats'),
      where('memberIds', 'array-contains', userId),
    );
  }

  private async removeMemberships(
    snapshot: QuerySnapshot<DocumentData>,
    userId: string,
  ): Promise<void> {
    const batch = writeBatch(this.firebase.firestore);
    snapshot.docs.forEach(({ ref }) => this.removeMembership(batch, ref, userId));
    await batch.commit();
  }

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
