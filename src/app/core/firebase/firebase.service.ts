import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private readonly platformId = inject(PLATFORM_ID);

  private appInstance: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private firestoreInstance: Firestore | null = null;

  readonly isBrowser = isPlatformBrowser(this.platformId);

  get auth(): Auth {
    this.assertBrowser();
    this.authInstance ??= getAuth(this.app);
    return this.authInstance;
  }

  get firestore(): Firestore {
    this.assertBrowser();
    this.firestoreInstance ??= getFirestore(this.app);
    return this.firestoreInstance;
  }

  private get app(): FirebaseApp {
    this.appInstance ??= getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return this.appInstance;
  }

  private assertBrowser(): void {
    if (!this.isBrowser) {
      throw new Error('Firebase client services are only available in the browser.');
    }
  }
}
