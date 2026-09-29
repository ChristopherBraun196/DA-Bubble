import { Timestamp } from 'firebase/firestore';

/**
 * A single hit returned by the message search.
 *
 * @remarks
 * Carries enough context to render the result and to navigate to the exact
 * position inside the originating chat when selected.
 */
export interface MessageSearchResult {
  chatId: string;
  messageId: string;
  text: string;
  authorName: string;
  createdAt: Timestamp;
  /** Id of the message whose thread holds this reply, or `null` for top-level messages. */
  threadParentId: string | null;
}
