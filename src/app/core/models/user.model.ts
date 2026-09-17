import { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  displayName: string;
  nameNormalized: string;
  email: string | null;
  photoURL: string;
  isAnonymous: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastSeenAt: Timestamp | null;
}
