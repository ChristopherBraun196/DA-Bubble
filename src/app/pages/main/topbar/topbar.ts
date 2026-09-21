import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { GuestMembershipService } from '../../../core/services/guest-membership.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { ProfileDialog } from '../profile-dialog/profile-dialog';

/** Es ist immer hoechstens eine Card offen. */
export type TopbarPanel = 'none' | 'menu' | 'profile';

@Component({
  imports: [ProfileDialog, AvatarFallback],
  selector: 'app-topbar',
  styleUrl: './topbar.scss',
  templateUrl: './topbar.html',
})
export class Topbar {
  private readonly auth = inject(AuthService);
  private readonly guestMemberships = inject(GuestMembershipService);
  private readonly router = inject(Router);

  protected readonly userName = computed(() => this.auth.displayName());
  protected readonly userAvatar = computed(() => this.auth.photoURL());

  protected readonly panel = signal<TopbarPanel>('none');

  protected toggleMenu(): void {
    this.panel.update((current) => (current === 'menu' ? 'none' : 'menu'));
  }

  protected openProfile(): void {
    this.panel.set('profile');
  }

  protected closePanel(): void {
    this.panel.set('none');
  }

  protected async logout(): Promise<void> {
    this.closePanel();
    const user = this.auth.currentUser();

    if (user?.isAnonymous) {
      await this.guestMemberships.removeFromAllChats(user.uid).catch(() => undefined);
    }

    await this.auth.logout();
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
