import { Component, computed, output, signal } from '@angular/core';

export type AddPeopleMode = 'all' | 'specific';

@Component({
  imports: [],
  selector: 'app-add-people',
  styleUrl: './add-people.scss',
  templateUrl: './add-people.html',
})
export class AddPeople {
  readonly closed = output<void>();

  protected readonly mode = signal<AddPeopleMode>('all');
  protected readonly personName = signal('');

  /** Bei "Bestimmte Leute" ist das Namensfeld Pflicht. */
  protected readonly canCreate = computed(
    () => this.mode() === 'all' || this.personName().trim().length > 0,
  );

  protected setMode(mode: AddPeopleMode): void {
    this.mode.set(mode);
  }

  protected updatePersonName(event: Event): void {
    this.personName.set((event.target as HTMLInputElement).value);
  }

  protected create(): void {
    if (!this.canCreate()) {
      return;
    }

    // TODO: Mitglieder in Firebase eintragen, sobald das eingerichtet ist.
    this.closed.emit();
  }
}
