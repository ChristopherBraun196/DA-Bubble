import { MessageSearchResult } from '../../../core/models/message-search.model';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AppUser } from '../../../core/models/user.model';
import { WorkspaceSearch } from '../workspace-search/workspace-search';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { GuestMembershipService } from '../../../core/services/guest-membership.service';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { ProfileDialog } from '../profile-dialog/profile-dialog';

/** Es ist immer hoechstens eine Card offen. */
export type TopbarPanel = 'none' | 'menu' | 'profile';

@Component({
  imports: [ProfileDialog, AvatarFallback, WorkspaceSearch],
  selector: 'app-topbar',
  styleUrl: './topbar.scss',
  templateUrl: './topbar.html',
})
/** Top bar with the workspace search and the current user's menu. */
export class Topbar {
  /** Swaps the logo and search for a way back to the sidebar on narrow screens. */
  readonly backVisible = input(false);
  /** False once the sidebar carries the workspace search instead. */
  readonly searchVisible = input(true);

  readonly back = output<void>();
  readonly messageSelected = output<MessageSearchResult>();
  readonly channelSelected = output<string>();
  readonly directMessageRequested = output<AppUser>();

  private readonly auth = inject(AuthService);
  private readonly guestMemberships = inject(GuestMembershipService);
  private readonly router = inject(Router);

  protected readonly userName = computed(() => this.auth.displayName());
  protected readonly userAvatar = computed(() => this.auth.photoURL());

  protected readonly panel = signal<TopbarPanel>('none');

  /** Opens or closes the user menu. */
  protected toggleMenu(): void {
    this.panel.update((current) => (current === 'menu' ? 'none' : 'menu'));
  }

  /** Replaces the menu with the profile dialog. */
  protected openProfile(): void {
    this.panel.set('profile');
  }

  /** Closes whichever panel is open. */
  protected closePanel(): void {
    this.panel.set('none');
  }

  /** Signs the user out and returns to the intro page. */
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
