import { Component, output, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-create-channel',
  styleUrl: './create-channel.scss',
  templateUrl: './create-channel.html',
})
export class CreateChannel {
  readonly closed = output<void>();

  protected readonly channelName = signal('');
  protected readonly description = signal('');

  protected updateName(event: Event): void {
    this.channelName.set((event.target as HTMLInputElement).value);
  }

  protected updateDescription(event: Event): void {
    this.description.set((event.target as HTMLInputElement).value);
  }

  protected create(): void {
    // TODO: Channel in Firebase anlegen, sobald das eingerichtet ist.
    this.closed.emit();
  }
}
