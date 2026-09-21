import { Component, computed, input } from '@angular/core';

import { AvatarFallback } from '../../../shared/avatar-fallback/avatar-fallback';
import { DirectMessageUser } from '../../Devspace-nav/direct-message-list/direct-message-list';
import { MessageInput } from '../message-input/message-input';

@Component({
  imports: [MessageInput, AvatarFallback],
  selector: 'app-direct-message-view',
  styleUrl: './direct-message-view.scss',
  templateUrl: './direct-message-view.html',
})
export class DirectMessageView {
  readonly user = input.required<DirectMessageUser>();

  protected readonly displayName = computed(() => this.user().name);
  protected readonly isCurrentUser = computed(() => this.user().isCurrentUser === true);
  protected readonly placeholder = computed(
    () => `Nachricht an ${this.displayName().replace(' (Du)', '')}`,
  );
}
