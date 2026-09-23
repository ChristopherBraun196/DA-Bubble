import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
/**
 * Lazily creates and shares the Firebase app, auth and Firestore instances.
 *
 * @remarks
 * All getters throw during server-side rendering, where the Firebase client
 * SDK is unavailable. Check {@link FirebaseService.isBrowser} before use.
 */
export class FirebaseService {
  private readonly platformId = inject(PLATFORM_ID);

  private appInstance: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private firestoreInstance: Firestore | null = null;

  readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * The shared Firebase Auth instance.
   *
   * @throws Error when accessed outside the browser.
   */
  get auth(): Auth {
    this.assertBrowser();
    this.authInstance ??= getAuth(this.app);
    return this.authInstance;
  }

  /**
   * The shared Firestore instance.
   *
   * @throws Error when accessed outside the browser.
   */
  get firestore(): Firestore {
    this.assertBrowser();
    this.firestoreInstance ??= getFirestore(this.app);
    return this.firestoreInstance;
  }

  /** Reuses an already initialised app so hot reloads do not create a second one. */
  private get app(): FirebaseApp {
    this.appInstance ??= getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return this.appInstance;
  }

  /**
   * Guards browser-only Firebase access.
   *
   * @throws Error when running on the server.
   */
  private assertBrowser(): void {
    if (!this.isBrowser) {
      throw new Error('Firebase client services are only available in the browser.');
    }
  }
}
