import { Component, computed, input, output, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-add-members',
  styleUrl: './add-members.scss',
  templateUrl: './add-members.html',
})
export class AddMembers {
  readonly channelName = input.required<string>();
  readonly closed = output<void>();

  protected readonly personName = signal('');
  protected readonly canAdd = computed(() => this.personName().trim().length > 0);

  protected updatePersonName(event: Event): void {
    this.personName.set((event.target as HTMLInputElement).value);
  }

  protected add(): void {
    if (!this.canAdd()) {
      return;
    }

    // TODO: Mitglied in Firebase eintragen, sobald das eingerichtet ist.
    this.closed.emit();
  }
}
