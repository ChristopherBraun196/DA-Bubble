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
  private cachedUsers?: Promise<UserSearchResult[]>;

  async getAllUsers(): Promise<UserSearchResult[]> {
    const snapshot = await getDocs(collection(this.firebase.firestore, 'users'));

    return snapshot.docs
      .map((userSnapshot) => this.mapSearchResult(userSnapshot))
      .sort((first, second) => first.displayName.localeCompare(second.displayName, 'de'));
  }

  async searchByName(term: string, maxResults = 8): Promise<UserSearchResult[]> {
    const search = term.trim().toLocaleLowerCase('de-DE');

    if (search.length < 3) {
      return [];
    }
    const users = await this.getCachedUsers();
    return users
      .filter(({ displayName }) => displayName.toLocaleLowerCase('de-DE').includes(search))
      .slice(0, maxResults);
  }

  private getCachedUsers(): Promise<UserSearchResult[]> {
    this.cachedUsers ??= this.getAllUsers();
    return this.cachedUsers;
  }

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

  async getProfile(uid: string): Promise<AppUser | null> {
    const snapshot = await getDoc(doc(this.firebase.firestore, 'users', uid));
    return snapshot.exists() ? { ...snapshot.data(), uid: snapshot.id } as AppUser : null;
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
