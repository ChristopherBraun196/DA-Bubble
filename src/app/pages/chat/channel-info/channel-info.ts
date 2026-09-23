import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  imports: [],
  selector: 'app-channel-info',
  styleUrl: './channel-info.scss',
  templateUrl: './channel-info.html',
})
/** Channel details with inline editing for name and description. */
export class ChannelInfo {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly users = inject(UserService);

  readonly channelName = input.required<string>();
  readonly closed = output<void>();

  private readonly activeChat = computed(() =>
    this.chats.chats().find(({ id }) => id === this.chats.activeChatId()),
  );

  /** Kommt direkt aus Firestore - nach dem Speichern aktualisiert der Snapshot die Anzeige. */
  protected readonly name = computed(() => this.activeChat()?.name || this.channelName());
  protected readonly description = computed(() => this.activeChat()?.description || '');

  /** Wird aus der createdBy-UID des Channels nachgeladen. */
  protected readonly createdBy = signal('');

  protected readonly editingName = signal(false);
  protected readonly editingDescription = signal(false);

  protected readonly saving = signal(false);
  protected readonly leaving = signal(false);
  protected readonly saveError = signal('');

  /** Die Entwuerfe starten leer, der aktuelle Wert steht als Platzhalter im Feld. */
  protected readonly nameDraft = signal('');
  protected readonly descriptionDraft = signal('');

  constructor() {
    effect(() => {
      void this.loadCreator(this.activeChat()?.createdBy || '');
    });
  }

  /**
   * Resolves the name behind the channel's creator id.
   *
   * @param creatorId - Uid stored on the channel.
   */
  private async loadCreator(creatorId: string): Promise<void> {
    if (!creatorId) {
      this.createdBy.set('Unbekannt');
      return;
    }

    const creator = await this.users.findById(creatorId);
    this.createdBy.set(creator?.displayName || 'Unbekannter Nutzer');
  }

  /** Switches the name into edit mode with an empty draft. */
  protected startNameEdit(): void {
    this.nameDraft.set('');
    this.saveError.set('');
    this.editingName.set(true);
  }

  /**
   * Stores a new channel name.
   *
   * @remarks
   * Rejects names already taken by another channel before writing.
   */
  protected async saveName(): Promise<void> {
    const name = this.nameDraft().trim();

    if (!name) {
      this.editingName.set(false);
      return;
    }

    if (this.chats.channelNameExists(name, this.activeChat()?.id)) {
      this.saveError.set('Es gibt bereits einen Channel mit diesem Namen.');
      return;
    }

    if (await this.updateChannel({ name })) {
      this.editingName.set(false);
    }
  }

  /** Switches the description into edit mode with an empty draft. */
  protected startDescriptionEdit(): void {
    this.descriptionDraft.set('');
    this.saveError.set('');
    this.editingDescription.set(true);
  }

  /** Stores a new channel description. */
  protected async saveDescription(): Promise<void> {
    const description = this.descriptionDraft().trim();

    if (!description) {
      this.editingDescription.set(false);
      return;
    }

    if (await this.updateChannel({ description })) {
      this.editingDescription.set(false);
    }
  }

  /**
   * Writes the changed fields and reports whether it worked.
   *
   * @param changes - The fields to overwrite.
   * @returns True on success, false when the write failed.
   */
  private async updateChannel(changes: { name?: string; description?: string }): Promise<boolean> {
    const chatId = this.activeChat()?.id;

    if (!chatId || this.saving()) {
      return false;
    }

    this.saving.set(true);
    this.saveError.set('');

    try {
      await this.chats.updateChannel(chatId, changes);
      return true;
    } catch {
      this.saveError.set('Die Änderung konnte nicht gespeichert werden. Versuch es noch einmal.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Tracks what is typed into the name field.
   *
   * @param event - The input event of the text field.
   */
  protected updateNameDraft(event: Event): void {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

  /**
   * Tracks what is typed into the description field.
   *
   * @param event - The input event of the text area.
   */
  protected updateDescriptionDraft(event: Event): void {
    this.descriptionDraft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Removes the signed-in user from this channel and closes the dialog. */
  protected async leaveChannel(): Promise<void> {
    const identifiers = this.getLeaveIdentifiers();
    if (!identifiers || this.leaving()) {
      return;
    }
    await this.removeMembership(identifiers);
  }

  /**
   * Collects the ids needed to leave the channel.
   *
   * @returns Chat and user id, or `null` when either is missing.
   */
  private getLeaveIdentifiers(): { chatId: string; userId: string } | null {
    const chatId = this.activeChat()?.id;
    const userId = this.auth.currentUser()?.uid;
    return chatId && userId ? { chatId, userId } : null;
  }

  /**
   * Removes the user from the channel and closes the dialog.
   *
   * @param ids - Chat and user id of the membership to drop.
   */
  private async removeMembership(ids: { chatId: string; userId: string }): Promise<void> {
    this.leaving.set(true);
    this.saveError.set('');
    try {
      await this.chats.leaveChannel(ids.chatId, ids.userId);
      this.closed.emit();
    } catch {
      this.saveError.set('Der Channel konnte nicht verlassen werden. Versuch es noch einmal.');
    } finally {
      this.leaving.set(false);
    }
  }
}
