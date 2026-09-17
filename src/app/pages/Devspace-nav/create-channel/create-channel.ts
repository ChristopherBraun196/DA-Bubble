import { Component, computed, output, signal } from '@angular/core';
import { AddPeople } from '../add-people/add-people';

@Component({
  imports: [AddPeople],
  selector: 'app-create-channel',
  styleUrl: './create-channel.scss',
  templateUrl: './create-channel.html',
})
export class CreateChannel {
  readonly closed = output<void>();

  /** Schritt 1: Channel-Daten, Schritt 2: Leute hinzufuegen. */
  protected readonly step = signal<'channel' | 'people'>('channel');

  protected readonly channelName = signal('');
  protected readonly description = signal('');

  /** Channel-Name ist Pflicht - der Button bleibt bis dahin gesperrt. */
  protected readonly canCreate = computed(() => this.channelName().trim().length > 0);

  protected updateName(event: Event): void {
    this.channelName.set((event.target as HTMLInputElement).value);
  }

  protected updateDescription(event: Event): void {
    this.description.set((event.target as HTMLInputElement).value);
  }

  protected create(): void {
    if (!this.canCreate()) {
      return;
    }

    // TODO: Channel in Firebase anlegen, sobald das eingerichtet ist.
    this.step.set('people');
  }
}
