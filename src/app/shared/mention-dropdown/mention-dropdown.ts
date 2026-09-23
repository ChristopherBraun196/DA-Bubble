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

/**
 * One selectable row in the dropdown — a channel or a person.
 *
 * @remarks
 * Both kinds share this shape so the component can serve every call site
 * without knowing what it is listing.
 */
export interface MentionEntry {
  id: string;
  /** Text shown in the row. */
  label: string;
  /** Text inserted on selection; defaults to {@link MentionEntry.label}. */
  value?: string;
  id: string;
  label: string;
  value?: string;
  /** Optional secondary line, for example an email address. */
  description?: string;
  /** Text the filter matches against; defaults to {@link MentionEntry.label}. */
  searchText?: string;
  description?: string;
  searchText?: string;
  /** Avatar URL for people. */
  avatar?: string;
  /** Leading glyph for channels, typically `#`. */
  icon?: string;
  avatar?: string;
  icon?: string;
}

@Component({
  imports: [AvatarFallback],
  selector: 'app-mention-dropdown',
  styleUrl: './mention-dropdown.scss',
  templateUrl: './mention-dropdown.html',
})
/**
 * Filterable list of channels and people for `#` and `@` autocomplete.
 *
 * @remarks
 * Reused by the new-message address field, the message input and the
 * workspace search. The host decides which entries to pass in; this component
 * only filters, highlights and reports the selection.
 */
export class MentionDropdown {
  private readonly activePosition = signal(0);
  private readonly optionElements = viewChildren<ElementRef<HTMLButtonElement>>('option');

  readonly entries = input<MentionEntry[]>([]);
  readonly search = input('');
  readonly selected = output<MentionEntry>();

  /** The entries left after applying {@link MentionDropdown.search}. */
  protected readonly visibleEntries = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.entries();
    }
    return this.entries().filter((entry) =>
      (entry.searchText ?? entry.label).toLowerCase().includes(term),
    );
  });

  /** Index of the keyboard-highlighted row, clamped to the visible entries. */
  protected readonly activeIndex = computed(() => {
    const lastIndex = this.visibleEntries().length - 1;
    return Math.min(this.activePosition(), Math.max(lastIndex, 0));
  });

  /**
   * Handles arrow and enter keys on behalf of the host input.
   *
   * @param event - The keyboard event from the input the dropdown belongs to.
   *
   * @remarks
   * Called by the host because focus stays in the text field while the list
   * is open. Other keys are left untouched.
   */
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

  /**
   * Highlights a row, used when the pointer moves over it.
   *
   * @param index - Position within the visible entries.
   */
  protected setActiveIndex(index: number): void {
    this.activePosition.set(index);
  }

  /** Emits the currently highlighted entry. */
  private selectActive(): void {
    const entry = this.visibleEntries()[this.activeIndex()];

    if (entry) {
      this.selected.emit(entry);
    }
  }

  /**
   * Moves the highlight, wrapping around at both ends.
   *
   * @param offset - `1` for down, `-1` for up.
   */
  private moveActive(offset: number): void {
    const length = this.visibleEntries().length;
    if (!length) {
      return;
    }
    this.activePosition.set((this.activeIndex() + offset + length) % length);
    requestAnimationFrame(() => this.scrollActiveIntoView());
  }

  /** Keeps the highlighted row visible while navigating by keyboard. */
  private scrollActiveIntoView(): void {
    this.optionElements()[this.activeIndex()]?.nativeElement.scrollIntoView({ block: 'nearest' });
  }
}
