import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  imports: [],
  selector: 'app-channel-info',
  styleUrl: './channel-info.scss',
  templateUrl: './channel-info.html',
})
export class ChannelInfo {
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
  protected readonly saveError = signal('');

  /** Die Entwuerfe starten leer, der aktuelle Wert steht als Platzhalter im Feld. */
  protected readonly nameDraft = signal('');
  protected readonly descriptionDraft = signal('');

  constructor() {
    effect(() => {
      void this.loadCreator(this.activeChat()?.createdBy || '');
    });
  }

  private async loadCreator(creatorId: string): Promise<void> {
    if (!creatorId) {
      this.createdBy.set('Unbekannt');
      return;
    }

    const creator = await this.users.findById(creatorId);
    this.createdBy.set(creator?.displayName || 'Unbekannter Nutzer');
  }

  protected startNameEdit(): void {
    this.nameDraft.set('');
    this.saveError.set('');
    this.editingName.set(true);
  }

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

  protected startDescriptionEdit(): void {
    this.descriptionDraft.set('');
    this.saveError.set('');
    this.editingDescription.set(true);
  }

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

  protected updateNameDraft(event: Event): void {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

  protected updateDescriptionDraft(event: Event): void {
    this.descriptionDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected leaveChannel(): void {
    // TODO: Mitgliedschaft in Firebase entfernen, sobald das eingerichtet ist.
    this.closed.emit();
  }
}
