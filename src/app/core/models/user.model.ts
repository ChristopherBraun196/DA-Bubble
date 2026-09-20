import { Timestamp } from 'firebase/firestore';

export interface UserSearchResult {
  uid: string;
  displayName: string;
  photoURL: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  nameNormalized: string;
  email: string | null;
  photoURL: string;
  isAnonymous: boolean;
  onboardingCompleted: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastSeenAt: Timestamp | null;
}
