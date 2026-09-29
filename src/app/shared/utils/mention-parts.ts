import { UserSearchResult } from '../../core/models/user.model';

/** A piece of message text, either plain or a mention of a known user. */
export interface MessagePart {
  text: string;
  /** Id of the mentioned user, only set for mentions. */
  userId?: string;
}

/**
 * Splits a message into plain text and `@` mentions of known users.
 *
 * @param text - The message body.
 * @param users - Everyone who can be mentioned.
 * @returns The parts in reading order.
 */
export function splitMentions(text: string, users: UserSearchResult[]): MessagePart[] {
  const pattern = createMentionPattern(users);
  if (!pattern) return [{ text }];
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => toMessagePart(part, users));
}

/** Builds a pattern matching `@Name` for every known user, longest names first. */
function createMentionPattern(users: UserSearchResult[]): RegExp | null {
  const names = users
    .map(({ displayName }) => displayName.trim())
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return names.length ? new RegExp(`(@(?:${names.join('|')}))(?![\\p{L}\\p{N}])`, 'u') : null;
}

/** Marks a piece as a mention when it names a known user. */
function toMessagePart(text: string, users: UserSearchResult[]): MessagePart {
  const user = users.find(({ displayName }) => `@${displayName.trim()}` === text);
  return user ? { text, userId: user.uid } : { text };
}
