import { Injectable, signal } from '@angular/core';
import { ReactionEmoji } from '../models/reaction.model';

const DEFAULT_REACTIONS: ReactionEmoji[] = ['✅', '🙌'];
const STORAGE_KEY = 'da-bubble-recent-reactions';

@Injectable({ providedIn: 'root' })
/** Keeps the two most recently used reaction emoji available across messages. */
export class ReactionHistoryService {
  private readonly recentState = signal<ReactionEmoji[]>(this.load());

  readonly recent = this.recentState.asReadonly();

  /** Moves a used emoji to the front and persists the resulting pair. */
  record(emoji: ReactionEmoji): void {
    const recent = this.withDefaults([emoji, ...this.recentState()]);
    this.recentState.set(recent);
    this.save(recent);
  }

  /** Loads the stored pair, falling back to the Figma defaults. */
  private load(): ReactionEmoji[] {
    if (typeof localStorage === 'undefined') return [...DEFAULT_REACTIONS];
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return this.withDefaults(Array.isArray(stored) ? stored : []);
    } catch {
      return [...DEFAULT_REACTIONS];
    }
  }

  /** Removes duplicates, fills missing entries and keeps exactly two emoji. */
  private withDefaults(emojis: unknown[]): ReactionEmoji[] {
    const valid = emojis.filter((emoji): emoji is string => typeof emoji === 'string' && !!emoji);
    return [...new Set([...valid, ...DEFAULT_REACTIONS])].slice(0, 2);
  }

  /** Stores the pair when browser storage is available. */
  private save(recent: ReactionEmoji[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // The buttons still work when storage is unavailable.
    }
  }
}
