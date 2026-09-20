import { inject, Injectable } from '@angular/core';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { AppUser, UserSearchResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firebase = inject(FirebaseService);

  /** Sucht ueber das Feld nameNormalized, also unabhaengig von Gross- und Kleinschreibung. */
  async findByName(name: string): Promise<UserSearchResult[]> {
    const nameNormalized = name.trim().toLocaleLowerCase('de-DE');

    if (!nameNormalized) {
      return [];
    }

    const usersQuery = query(
      collection(this.firebase.firestore, 'users'),
      where('nameNormalized', '==', nameNormalized),
    );
    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.map((userSnapshot) => this.mapSearchResult(userSnapshot));
  }

  async findById(uid: string): Promise<UserSearchResult | null> {
    if (!uid) {
      return null;
    }

    const snapshot = await getDoc(doc(this.firebase.firestore, 'users', uid));

    return snapshot.exists() ? this.mapSearchResult(snapshot) : null;
  }

  private mapSearchResult(snapshot: DocumentSnapshot<DocumentData>): UserSearchResult {
    const data = (snapshot.data() ?? {}) as Partial<AppUser>;

    return {
      uid: snapshot.id,
      displayName: data.displayName || 'Unbekannter Nutzer',
      photoURL: data.photoURL || '/img/Profile_Guest.png',
    };
  }

  async ensureUser(authUser: User): Promise<void> {
    const userRef = doc(this.firebase.firestore, 'users', authUser.uid);
    const snapshot = await getDoc(userRef);
    const existingUser = snapshot.exists() ? (snapshot.data() as Partial<AppUser>) : null;
    const displayName = this.resolveDisplayName(authUser, existingUser);
    const onboardingCompleted = this.resolveOnboardingStatus(authUser, existingUser);

    await setDoc(
      userRef,
      {
        uid: authUser.uid,
        displayName,
        nameNormalized: displayName.toLocaleLowerCase('de-DE'),
        email: authUser.email,
        photoURL: authUser.photoURL || existingUser?.photoURL || '/img/Profile_Guest.png',
        isAnonymous: authUser.isAnonymous,
        onboardingCompleted,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(snapshot.exists()
          ? {}
          : {
              createdAt: serverTimestamp(),
            }),
      },
      { merge: true },
    );
  }

  private resolveDisplayName(authUser: User, existingUser: Partial<AppUser> | null): string {
    const authDisplayName = authUser.displayName?.trim();

    if (authDisplayName) {
      return authDisplayName;
    }

    if (existingUser?.displayName) {
      return existingUser.displayName;
    }

    if (authUser.isAnonymous) {
      return 'Gast';
    }

    return authUser.email?.split('@')[0] || 'Nutzer';
  }

  private resolveOnboardingStatus(authUser: User, existingUser: Partial<AppUser> | null): boolean {
    const usesGoogle = authUser.providerData.some(({ providerId }) => providerId === 'google.com');
    return Boolean(
      existingUser?.onboardingCompleted || authUser.isAnonymous || usesGoogle || authUser.photoURL,
    );
  }
}
