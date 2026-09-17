import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  imports: [],
  selector: 'app-topbar',
  styleUrl: './topbar.scss',
  templateUrl: './topbar.html',
})
export class Topbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly userName = computed(() => {
    const user = this.auth.currentUser();

    if (!user || user.isAnonymous) {
      return 'Gast';
    }

    return user.displayName || user.email?.split('@')[0] || 'Nutzer';
  });

  protected readonly userAvatar = computed(
    () => this.auth.currentUser()?.photoURL || '/img/Profile_Guest.png',
  );

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
