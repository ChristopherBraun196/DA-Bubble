import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
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
    await this.users.ensureUser(credential.user);
    return credential.user;
  }

  async loginWithGoogle(): Promise<User> {
    const credential = await signInWithPopup(this.firebase.auth, new GoogleAuthProvider());
    await this.users.ensureUser(credential.user);
    return credential.user;
  }

  async loginAsGuest(): Promise<User> {
    const credential = await signInAnonymously(this.firebase.auth);
    await this.users.ensureUser(credential.user);
    return credential.user;
  }

  async registerWithEmail(email: string, password: string, displayName: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(this.firebase.auth, email, password);
    await updateProfile(credential.user, { displayName: displayName.trim() });
    await this.users.ensureUser(credential.user);
    return credential.user;
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebase.auth, email);
  }

  async logout(): Promise<void> {
    await signOut(this.firebase.auth);
  }
}
