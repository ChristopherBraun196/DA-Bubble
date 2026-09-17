import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-user-list-item',
  styleUrl: './user-list-item.scss',
  templateUrl: './user-list-item.html',
})
export class UserListItem {
  readonly name = input.required<string>();
  readonly avatar = input.required<string>();
  readonly online = input(false);
  readonly active = input(false);
  readonly selected = output<void>();
}
