import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-avatar-picker',
  styleUrl: './avatar-picker.scss',
  templateUrl: './avatar-picker.html',
})
export class AvatarPicker {
  /** Path of the avatar currently in use, highlighted in the list. */
  readonly selected = input('');

  /** Emits the path of the avatar the user picked. */
  readonly picked = output<string>();

  protected readonly avatars = Array.from(
    { length: 6 },
    (_, index) => `/img/Profile_picture_${index + 1}.png`,
  );
}
