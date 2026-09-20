import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ProfileDialog } from '../profile-dialog/profile-dialog';

/** Es ist immer hoechstens eine Card offen. */
export type TopbarPanel = 'none' | 'menu' | 'profile';

@Component({
  imports: [ProfileDialog],
  selector: 'app-topbar',
  styleUrl: './topbar.scss',
  templateUrl: './topbar.html',
})
export class Topbar {
  private readonly auth = inject(AuthService);
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
    await this.auth.logout();
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
