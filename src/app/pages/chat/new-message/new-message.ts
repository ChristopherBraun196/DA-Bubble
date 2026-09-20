import { Component, signal, computed } from '@angular/core';
import { MessageInput } from '../message-input/message-input';

// Dummy-Liste
import { MentionDropdown, MentionEntry } from '../../../shared/mention-dropdown/mention-dropdown';

@Component({
  imports: [MessageInput, MentionDropdown],
  selector: 'app-new-message',
  styleUrl: './new-message.scss',
  templateUrl: './new-message.html',
})
export class NewMessage {
  //  todo: Empfänger und  Chat anlegen.
  protected readonly recipient = signal('');

  protected updateRecipient(event: Event): void {
    this.recipient.set((event.target as HTMLInputElement).value);
  }

  /** Nur zum Ausprobieren - spaeter kommen echte Channels und Mitglieder rein. */
  protected readonly testChannels: MentionEntry[] = [
    { id: '1', label: 'Entwicklerteam' },
    { id: '2', label: 'Office-team' },
  ];

  protected readonly testUsers: MentionEntry[] = [
    { id: '3', label: 'Sofia Müller' },
    { id: '4', label: 'Noah Braun' },
  ];

  /** Was nach dem # oder @ getippt wurde - ohne Praefix gibt es nichts zu suchen. */
  protected readonly mentionSearch = computed(() => {
    const value = this.recipient();

    return value.startsWith('#') || value.startsWith('@') ? value.slice(1) : '';
  });

  /** # zeigt Channels, @ zeigt Personen. */
  protected readonly mentionEntries = computed(() =>
    this.recipient().startsWith('#') ? this.testChannels : this.testUsers,
  );
}
