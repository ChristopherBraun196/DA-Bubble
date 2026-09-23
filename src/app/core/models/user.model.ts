import { Timestamp } from 'firebase/firestore';

/**
 * Minimal user data used by search results and mention dropdowns.
 *
 * @remarks
 * Deliberately smaller than {@link AppUser} so lists can be rendered without
 * loading the full user document.
 */
export interface UserSearchResult {
  uid: string;
  displayName: string;
  photoURL: string;
}

/**
 * A user document stored in the `users` collection.
 *
 * @remarks
 * The data originates from Firebase Auth and is mirrored to Firestore on every
 * sign-in so that other users can read it.
 */
export interface AppUser {
  uid: string;
  displayName: string;
  /** Lower-cased display name, used for case-insensitive search. */
  nameNormalized: string;
  email: string | null;
  photoURL: string;
  /** True for guest sessions created through `signInAnonymously`. */
  isAnonymous: boolean;
  /** True once registration including avatar selection has been completed. */
  onboardingCompleted: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastSeenAt: Timestamp | null;
}
