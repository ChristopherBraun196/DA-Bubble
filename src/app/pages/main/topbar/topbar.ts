import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-topbar',
  styleUrl: './topbar.scss',
  templateUrl: './topbar.html',
})
export class Topbar {
  private readonly router = inject(Router);

  /** Platzhalter, bis der echte User aus dem Auth-Service kommt. */
  protected readonly userName = signal('Gast');
  protected readonly userAvatar = signal('/img/Profile_Guest.png');

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    // TODO: an den Auth-Service anbinden, sobald Firebase eingerichtet ist.
    this.closeMenu();
    void this.router.navigateByUrl('/');
  }
}
