import { Component, input, linkedSignal, output, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-channel-info',
  styleUrl: './channel-info.scss',
  templateUrl: './channel-info.html',
})
export class ChannelInfo {
  readonly channelName = input.required<string>();
  readonly closed = output<void>();

  /** Folgt dem Channel aus dem Header, laesst sich aber hier ueberschreiben. */
  protected readonly name = linkedSignal(() => this.channelName());

  /** Platzhalter, kommt spaeter aus Firebase. */
  protected readonly description = signal(
    'Dieser Channel ist für alles rund um #dfsdf vorgesehen. Hier kannst du zusammen mit deinem Team Meetings abhalten, Dokumente teilen und Entscheidungen treffen.',
  );
  protected readonly createdBy = signal('Noah Braun');

  protected readonly editingName = signal(false);
  protected readonly editingDescription = signal(false);

  /** Die Entwuerfe starten leer, der aktuelle Wert steht als Platzhalter im Feld. */
  protected readonly nameDraft = signal('');
  protected readonly descriptionDraft = signal('');

  protected startNameEdit(): void {
    this.nameDraft.set('');
    this.editingName.set(true);
  }

  protected saveName(): void {
    const value = this.nameDraft().trim();

    if (value) {
      // TODO: Channel in Firebase umbenennen, sobald das eingerichtet ist.
      this.name.set(value);
    }

    this.editingName.set(false);
  }

  protected startDescriptionEdit(): void {
    this.descriptionDraft.set('');
    this.editingDescription.set(true);
  }

  protected saveDescription(): void {
    const value = this.descriptionDraft().trim();

    if (value) {
      // TODO: Beschreibung in Firebase speichern, sobald das eingerichtet ist.
      this.description.set(value);
    }

    this.editingDescription.set(false);
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
