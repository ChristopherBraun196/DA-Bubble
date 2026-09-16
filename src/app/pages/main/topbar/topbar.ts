import { Component, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-topbar',
  styleUrl: './topbar.scss',
  templateUrl: './topbar.html',
})
export class Topbar {
  /** Platzhalter, bis der echte User aus dem Auth-Service kommt. */
  protected readonly userName = signal('Gast');
  protected readonly userAvatar = signal('/img/Profile_Guest.png');
}
