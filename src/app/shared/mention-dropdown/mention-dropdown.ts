import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { AvatarFallback } from '../avatar-fallback/avatar-fallback';

export interface MentionEntry {
  id: string;
  label: string;
  value?: string;
  description?: string;
  searchText?: string;
  avatar?: string;
  icon?: string;
}

@Component({
  imports: [AvatarFallback],
  selector: 'app-mention-dropdown',
  styleUrl: './mention-dropdown.scss',
  templateUrl: './mention-dropdown.html',
})
export class MentionDropdown {
  private readonly activePosition = signal(0);
  private readonly optionElements = viewChildren<ElementRef<HTMLButtonElement>>('option');

  readonly entries = input<MentionEntry[]>([]);
  readonly search = input('');
  readonly selected = output<MentionEntry>();

  protected readonly visibleEntries = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.entries();
    }
    return this.entries().filter((entry) =>
      (entry.searchText ?? entry.label).toLowerCase().includes(term),
    );
  });

  protected readonly activeIndex = computed(() => {
    const lastIndex = this.visibleEntries().length - 1;
    return Math.min(this.activePosition(), Math.max(lastIndex, 0));
  });

  public handleKeydown(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      return;
    }
    event.preventDefault();

    if (event.key === 'Enter') {
      this.selectActive();
      return;
    }
    this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
  }

  protected setActiveIndex(index: number): void {
    this.activePosition.set(index);
  }

  private selectActive(): void {
    const entry = this.visibleEntries()[this.activeIndex()];

    if (entry) {
      this.selected.emit(entry);
    }
  }

  private moveActive(offset: number): void {
    const length = this.visibleEntries().length;
    if (!length) {
      return;
    }
    this.activePosition.set((this.activeIndex() + offset + length) % length);
    requestAnimationFrame(() => this.scrollActiveIntoView());
  }

  private scrollActiveIntoView(): void {
    this.optionElements()[this.activeIndex()]?.nativeElement.scrollIntoView({ block: 'nearest' });
  }
}
