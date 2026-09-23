import { Component, computed, inject, output, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { AddPeople } from '../add-people/add-people';

@Component({
  imports: [AddPeople],
  selector: 'app-create-channel',
  styleUrl: './create-channel.scss',
  templateUrl: './create-channel.html',
})
/**
 * Two-step dialog: channel details first, then the people to invite.
 *
 * @remarks
 * The channel is created at the end of the first step, so the second one
 * already has an id to add members to.
 */
export class CreateChannel {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);

  readonly closed = output<void>();

  /** Schritt 1: Channel-Daten, Schritt 2: Leute hinzufuegen. */
  protected readonly step = signal<'channel' | 'people'>('channel');

  protected readonly channelName = signal('');
  protected readonly description = signal('');

  protected readonly creating = signal(false);
  protected readonly createError = signal('');

  /** Die ID des gerade angelegten Channels, in den Schritt 2 die Mitglieder eintraegt. */
  protected readonly createdChannelId = signal('');

  /** Der Channel, der beim Oeffnen aktiv war - Quelle fuer "Alle Mitglieder von ...". */
  protected readonly sourceChannelName: string;
  protected readonly sourceMemberIds: string[];

  /** Channel-Name ist Pflicht - der Button bleibt bis dahin gesperrt. */
  protected readonly canCreate = computed(() => this.channelName().trim().length > 0);

  constructor() {
    const activeChat = this.chats.chats().find(({ id }) => id === this.chats.activeChatId());

    this.sourceChannelName = activeChat?.name || '';
    this.sourceMemberIds = activeChat?.memberIds || [];
  }

  /**
   * Tracks what is typed into the name field.
   *
   * @param event - The input event of the text field.
   */
  protected updateName(event: Event): void {
    this.channelName.set((event.target as HTMLInputElement).value);
  }

  /**
   * Tracks what is typed into the description field.
   *
   * @param event - The input event of the text field.
   */
  protected updateDescription(event: Event): void {
    this.description.set((event.target as HTMLInputElement).value);
  }

  /**
   * Creates the channel and moves on to the invite step.
   *
   * @remarks
   * Rejects names already in use before writing anything.
   */
  protected async create(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;

    if (!this.canCreate() || this.creating() || !userId) {
      return;
    }

    if (this.chats.channelNameExists(this.channelName())) {
      this.createError.set('Es gibt bereits einen Channel mit diesem Namen.');
      return;
    }

    this.creating.set(true);
    this.createError.set('');

    try {
      await this.createChannel(userId);
    } catch {
      this.createError.set('Der Channel konnte nicht angelegt werden. Versuch es noch einmal.');
    } finally {
      this.creating.set(false);
    }
  }

  /**
   * Writes the channel and remembers its id for the invite step.
   *
   * @param userId - The creator's id.
   */
  private async createChannel(userId: string): Promise<void> {
    const channelId = await this.chats.createChannel(
      this.channelName(),
      this.description(),
      userId,
    );

    this.createdChannelId.set(channelId);
    this.step.set('people');
  }
}
