import { inject, Injectable, signal } from '@angular/core';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  where,
} from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { AppUser, UserSearchResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
/**
 * Reads and writes user documents in the `users` collection.
 *
 * @remarks
 * The full user list is cached after the first call, because mention dropdowns
 * and the workspace search request it repeatedly while typing.
 */
export class UserService {
  private readonly firebase = inject(FirebaseService);
  private cachedUsers?: Promise<UserSearchResult[]>;

  private unsubscribeFromDirectory?: Unsubscribe;
  private readonly directoryState = signal<ReadonlyMap<string, UserSearchResult>>(new Map());

  /** Live lookup of every user by uid, kept in sync with Firestore. */
  readonly directory = this.directoryState.asReadonly();

  /**
   * Returns every known user, cached after the first call.
   *
   * @returns All non-anonymous users reduced to the fields needed for lists.
   */
  async getAllUsers(): Promise<UserSearchResult[]> {
    const snapshot = await getDocs(collection(this.firebase.firestore, 'users'));

    return snapshot.docs
      .filter((userSnapshot) => userSnapshot.data()['isAnonymous'] !== true)
      .map((userSnapshot) => this.mapSearchResult(userSnapshot))
      .sort((first, second) => first.displayName.localeCompare(second.displayName, 'de'));
  }

  /**
   * Starts following every user document so names and avatars update live.
   *
   * @remarks
   * Safe to call repeatedly; only the first call opens a listener.
   */
  watchDirectory(): void {
    if (this.unsubscribeFromDirectory) {
      return;
    }
    const userRef = collection(this.firebase.firestore, 'users');
    this.unsubscribeFromDirectory = onSnapshot(
      userRef,
      (snapshot) => {
        const users = snapshot.docs.map((userSnapshot) => this.mapSearchResult(userSnapshot));
        this.directoryState.set(new Map(users.map((user) => [user.uid, user])));
      },
      () => this.stopWatchingDirectory(),
    );
  }

  /** Stops following the users, for example on sign-out. */
  stopWatchingDirectory(): void {
    this.unsubscribeFromDirectory?.();
    this.unsubscribeFromDirectory = undefined;
    this.directoryState.set(new Map());
  }

  /**
   * Finds users whose name contains the given term, ignoring case.
   *
   * @param term - The search term; a blank term yields no results.
   * @param maxResults - Upper bound on the number of hits.
   * @returns The matching users, limited to `maxResults`.
   */
  async searchByName(term: string, maxResults = 8): Promise<UserSearchResult[]> {
    const search = term.trim().toLocaleLowerCase('de-DE');

    if (!search) {
      return [];
    }
    const users = await this.getCachedUsers();
    return users
      .filter(({ displayName }) => displayName.toLocaleLowerCase('de-DE').includes(search))
      .slice(0, maxResults);
  }

  /** Returns the cached user list, loading it on first access. */
  private getCachedUsers(): Promise<UserSearchResult[]> {
    this.cachedUsers ??= this.getAllUsers();
    return this.cachedUsers;
  }

  /**
   * Looks up users by their exact name.
   *
   * @param name - The name to match, compared case-insensitively.
   * @returns All users carrying that name.
   */
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

  /**
   * Looks up a single user by id.
   *
   * @param uid - The Firebase Auth user id.
   * @returns The user, or `null` when no document exists.
   */
  async findById(uid: string): Promise<UserSearchResult | null> {
    if (!uid) {
      return null;
    }

    const snapshot = await getDoc(doc(this.firebase.firestore, 'users', uid));

    return snapshot.exists() ? this.mapSearchResult(snapshot) : null;
  }

  /**
   * Loads the complete user document.
   *
   * @param uid - The Firebase Auth user id.
   * @returns The stored user, or `null` when no document exists.
   */
  async getProfile(uid: string): Promise<AppUser | null> {
    const snapshot = await getDoc(doc(this.firebase.firestore, 'users', uid));
    return snapshot.exists() ? ({ ...snapshot.data(), uid: snapshot.id } as AppUser) : null;
  }

  /**
   * Reduces a Firestore snapshot to the fields lists need.
   *
   * @param snapshot - The user document.
   * @returns The mapped search result.
   */
  private mapSearchResult(snapshot: DocumentSnapshot<DocumentData>): UserSearchResult {
    const data = (snapshot.data() ?? {}) as Partial<AppUser>;

    return {
      uid: snapshot.id,
      displayName: data.displayName || 'Unbekannter Nutzer',
      photoURL: data.photoURL || '/img/Profile_Guest.png',
    };
  }

  /**
   * Creates or refreshes the Firestore document for an authenticated user.
   *
   * @param authUser - The user returned by Firebase Auth.
   *
   * @remarks
   * Called after every sign-in. Existing values win over the ones coming from
   * Auth, so a name changed inside the app is not overwritten on next login.
   */
  async ensureUser(authUser: User): Promise<void> {
    const userRef = doc(this.firebase.firestore, 'users', authUser.uid);
    const snapshot = await getDoc(userRef);
    const existingUser = snapshot.exists() ? (snapshot.data() as Partial<AppUser>) : null;
    const data = this.createUserDocument(authUser, existingUser);

    if (!snapshot.exists()) {
      data['createdAt'] = serverTimestamp();
    }
    await setDoc(userRef, data, { merge: true });
  }

  /**
   * Assembles the user document mirrored from Firebase Auth.
   *
   * @param authUser - The user returned by Firebase Auth.
   * @param existingUser - The stored document, when one exists.
   * @returns The fields to write.
   */
  private createUserDocument(authUser: User, existingUser: Partial<AppUser> | null): DocumentData {
    const displayName = this.resolveDisplayName(authUser, existingUser);

    return {
      uid: authUser.uid,
      displayName,
      nameNormalized: displayName.toLocaleLowerCase('de-DE'),
      email: authUser.email,
      photoURL: authUser.photoURL || existingUser?.photoURL || '/img/Profile_Guest.png',
      isAnonymous: authUser.isAnonymous,
      onboardingCompleted: this.resolveOnboardingStatus(authUser, existingUser),
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  /**
   * Picks the name to store, preferring what the user already set in the app.
   *
   * @param authUser - The user returned by Firebase Auth.
   * @param existingUser - The stored document, when one exists.
   * @returns The display name to persist.
   */
  private resolveDisplayName(authUser: User, existingUser: Partial<AppUser> | null): string {
    const guestName = authUser.isAnonymous ? 'Gast' : '';

    return (
      authUser.displayName?.trim() ||
      existingUser?.displayName ||
      guestName ||
      authUser.email?.split('@')[0] ||
      'Nutzer'
    );
  }

  /**
   * Determines whether registration has been completed.
   *
   * @param authUser - The user returned by Firebase Auth.
   * @param existingUser - The stored document, when one exists.
   * @returns True once the user has passed the avatar step.
   */
  private resolveOnboardingStatus(authUser: User, existingUser: Partial<AppUser> | null): boolean {
    const usesGoogle = authUser.providerData.some(({ providerId }) => providerId === 'google.com');
    return Boolean(
      existingUser?.onboardingCompleted || authUser.isAnonymous || usesGoogle || authUser.photoURL,
    );
  }
}
