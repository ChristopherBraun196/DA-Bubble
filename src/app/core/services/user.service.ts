import { inject, Injectable } from '@angular/core';
import { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { FirebaseService } from '../firebase/firebase.service';
import { AppUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firebase = inject(FirebaseService);

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
