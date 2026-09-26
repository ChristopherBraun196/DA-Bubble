import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
/** Logo header shared by the login flow and the legal pages. */
export class Header {
  readonly centered = input(false);
}
