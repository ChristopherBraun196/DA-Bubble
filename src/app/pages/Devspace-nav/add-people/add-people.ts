import { Component, computed, inject, input, output, signal } from '@angular/core';

import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';

export type AddPeopleMode = 'all' | 'specific';

@Component({
  imports: [],
  selector: 'app-add-people',
  styleUrl: './add-people.scss',
  templateUrl: './add-people.html',
})
export class AddPeople {
  private readonly chats = inject(ChatService);
  private readonly users = inject(UserService);

  readonly chatId = input.required<string>();
  readonly sourceChannelName = input('');
  readonly sourceMemberIds = input<string[]>([]);

  readonly closed = output<void>();

  protected readonly mode = signal<AddPeopleMode>('all');
  protected readonly personName = signal('');

  protected readonly adding = signal(false);
  protected readonly addError = signal('');

  /** Bei "Bestimmte Leute" ist das Namensfeld Pflicht. */
  protected readonly canCreate = computed(
    () => this.mode() === 'all' || this.personName().trim().length > 0,
  );

  protected setMode(mode: AddPeopleMode): void {
    this.mode.set(mode);
    this.addError.set('');
  }

  protected updatePersonName(event: Event): void {
    this.personName.set((event.target as HTMLInputElement).value);
  }

  protected async create(): Promise<void> {
    if (!this.canCreate() || this.adding()) {
      return;
    }

    this.adding.set(true);
    this.addError.set('');

    try {
      if (await this.addMembers()) {
        this.closed.emit();
      }
    } catch {
      this.addError.set('Die Mitglieder konnten nicht hinzugefügt werden. Versuch es noch einmal.');
    } finally {
      this.adding.set(false);
    }
  }

  private async addMembers(): Promise<boolean> {
    if (this.mode() === 'all') {
      await this.chats.addMembers(this.chatId(), this.sourceMemberIds());
      return true;
    }

    const matches = await this.users.findByName(this.personName());

    if (matches.length === 0) {
      this.addError.set('Zu diesem Namen wurde niemand gefunden.');
      return false;
    }

    await this.chats.addMembers(
      this.chatId(),
      matches.map(({ uid }) => uid),
    );
    return true;
  }
}
