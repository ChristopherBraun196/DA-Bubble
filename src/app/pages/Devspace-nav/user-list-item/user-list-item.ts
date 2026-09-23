import { Component, input, output } from '@angular/core';
import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';

@Component({
  imports: [AvatarFallback],
  selector: 'app-user-list-item',
  styleUrl: './user-list-item.scss',
  templateUrl: './user-list-item.html',
})
/** A single person row in the sidebar, including the online marker. */
export class UserListItem {
  readonly name = input.required<string>();
  readonly avatar = input.required<string>();
  readonly online = input(false);
  readonly active = input(false);
  readonly selected = output<void>();
}
