import { Component, computed, input, output } from '@angular/core';

export interface MentionEntry {
  id: string;
  label: string;
  avatar?: string;
}

@Component({
  imports: [],
  selector: 'app-mention-dropdown',
  styleUrl: './mention-dropdown.scss',
  templateUrl: './mention-dropdown.html',
})
export class MentionDropdown {
  readonly entries = input<MentionEntry[]>([]);
  readonly search = input('');
  readonly selected = output<MentionEntry>();

  protected readonly visibleEntries = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.entries();
    }
    return this.entries().filter((entry) => entry.label.toLowerCase().includes(term));
  });
}
