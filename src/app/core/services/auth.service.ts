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
/**
 * Single entry point for Firebase Authentication.
 *
 * @remarks
 * Exposes the current user as a signal and mirrors every successful sign-in to
 * Firestore through {@link UserService.ensureUser}, so profile data stays
 * readable for other users.
 */
export class AuthService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly firebase = inject(FirebaseService);
  private readonly users = inject(UserService);

  readonly currentUser = signal<User | null>(null);
  readonly authInitialized = signal(false);

  private readonly profileRevision = signal(0);

  /** Display name of the current user, falling back to "Gast" for anonymous sessions. */
  readonly displayName = computed(() => {
    this.profileRevision();
    const user = this.currentUser();

    if (!user || user.isAnonymous) {
      return 'Gast';
    }

    return user.displayName || user.email?.split('@')[0] || 'Nutzer';
  });

  /** Avatar URL of the current user, falling back to the guest placeholder. */
  readonly photoURL = computed(() => {
    this.profileRevision();
    return this.currentUser()?.photoURL || '/img/Profile_Guest.png';
  });

  /** Email address of the current user, or `null` for anonymous sessions. */
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

  /**
   * Signs in with email and password.
   *
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns The authenticated Firebase user.
   * @throws FirebaseError when the credentials are rejected.
   */
  async loginWithEmail(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.firebase.auth, email, password);
    return this.finishAuthentication(credential.user);
  }

  /**
   * Signs in through the Google popup flow.
   *
   * @returns The authenticated Firebase user.
   */
  async loginWithGoogle(): Promise<User> {
    const credential = await signInWithPopup(this.firebase.auth, new GoogleAuthProvider());
    return this.finishAuthentication(credential.user);
  }

  /**
   * Signs in anonymously so the app can be explored without registering.
   *
   * @returns The authenticated Firebase user.
   */
  async loginAsGuest(): Promise<User> {
    const credential = await signInAnonymously(this.firebase.auth);
    return this.finishAuthentication(credential.user);
  }

  /**
   * Creates a new account and applies the chosen display name and avatar.
   *
   * @param email - The email address to register.
   * @param password - The password for the new account.
   * @param displayName - The name shown to other users.
   * @param photoURL - Path of the avatar picked during registration.
   * @returns The newly created Firebase user.
   * @throws FirebaseError when the email is already in use or the password is too weak.
   */
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

  /**
   * Sends a password reset email.
   *
   * @param email - The address to send the reset link to.
   */
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebase.auth, email);
  }

  /**
   * Checks whether a reset code from the email link is still valid.
   *
   * @param code - The `oobCode` taken from the reset link.
   * @returns The email address the code belongs to.
   */
  verifyPasswordReset(code: string): Promise<string> {
    return verifyPasswordResetCode(this.firebase.auth, code);
  }

  /**
   * Applies a new password using the code from the reset email.
   *
   * @param code - The `oobCode` taken from the reset link.
   * @param password - The new password.
   */
  async resetPassword(code: string, password: string): Promise<void> {
    await confirmPasswordReset(this.firebase.auth, code, password);
  }

  /**
   * Renames the current user in both Firebase Auth and Firestore.
   *
   * @param displayName - The new name; ignored when blank.
   *
   * @remarks
   * Bumps an internal revision counter afterwards because Firebase mutates the
   * user object in place, which Angular's signals cannot detect on their own.
   */
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

  /**
   * Replaces the current user's avatar in both Firebase Auth and Firestore.
   *
   * @param photoURL - Path of the newly chosen avatar.
   */
  async updatePhotoURL(photoURL: string): Promise<void> {
    const user = this.currentUser();

    if (!user || !photoURL) {
      return;
    }

    await updateProfile(user, { photoURL });
    await this.users.ensureUser(user);
    this.profileRevision.update((revision) => revision + 1);
  }

  /** Signs the current user out and clears guest data where applicable. */
  async logout(): Promise<void> {
    await signOut(this.firebase.auth);
  }

  /**
   * Mirrors the authenticated user to Firestore.
   *
   * @param user - The freshly authenticated Firebase user.
   * @returns The same user, for chaining.
   */
  private async finishAuthentication(user: User): Promise<User> {
    await this.users.ensureUser(user);
    this.currentUser.set(user);
    return user;
  }
}
