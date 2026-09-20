import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  confirmPasswordReset,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
  verifyPasswordResetCode,
} from 'firebase/auth';

import { FirebaseService } from '../firebase/firebase.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly firebase = inject(FirebaseService);
  private readonly users = inject(UserService);

  readonly currentUser = signal<User | null>(null);
  readonly authInitialized = signal(false);

  private readonly profileRevision = signal(0);

  readonly displayName = computed(() => {
    this.profileRevision();
    const user = this.currentUser();

    if (!user || user.isAnonymous) {
      return 'Gast';
    }

    return user.displayName || user.email?.split('@')[0] || 'Nutzer';
  });

  readonly photoURL = computed(() => {
    this.profileRevision();
    return this.currentUser()?.photoURL || '/img/Profile_Guest.png';
  });

  readonly email = computed(() => {
    this.profileRevision();
    return this.currentUser()?.email ?? null;
  });

  constructor() {
    if (!this.firebase.isBrowser) {
      this.authInitialized.set(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(this.firebase.auth, (user) => {
      this.currentUser.set(user);
      this.authInitialized.set(true);
    });

    this.destroyRef.onDestroy(unsubscribe);
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.firebase.auth, email, password);
    return this.finishAuthentication(credential.user);
  }

  async loginWithGoogle(): Promise<User> {
    const credential = await signInWithPopup(this.firebase.auth, new GoogleAuthProvider());
    return this.finishAuthentication(credential.user);
  }

  async loginAsGuest(): Promise<User> {
    const credential = await signInAnonymously(this.firebase.auth);
    return this.finishAuthentication(credential.user);
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    photoURL: string,
  ): Promise<User> {
    const credential = await createUserWithEmailAndPassword(this.firebase.auth, email, password);

    try {
      await updateProfile(credential.user, { displayName: displayName.trim(), photoURL });
      return await this.finishAuthentication(credential.user);
    } catch (error) {
      await deleteUser(credential.user).catch(() => undefined);
      throw error;
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebase.auth, email);
  }

  verifyPasswordReset(code: string): Promise<string> {
    return verifyPasswordResetCode(this.firebase.auth, code);
  }

  async resetPassword(code: string, password: string): Promise<void> {
    await confirmPasswordReset(this.firebase.auth, code, password);
  }

  async updateDisplayName(displayName: string): Promise<void> {
    const user = this.currentUser();
    const name = displayName.trim();

    if (!user || !name) {
      return;
    }

    await updateProfile(user, { displayName: name });
    await this.users.ensureUser(user);
    this.profileRevision.update((revision) => revision + 1);
  }

  async logout(): Promise<void> {
    await signOut(this.firebase.auth);
  }

  private async finishAuthentication(user: User): Promise<User> {
    await this.users.ensureUser(user);
    this.currentUser.set(user);
    return user;
  }
}
