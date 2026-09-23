import { Timestamp } from 'firebase/firestore';
import { MessageReaction } from './reaction.model';

/**
 * A message stored in the `messages` subcollection of a chat.
 *
 * @remarks
 * The author's name and photo are denormalised into the message so the list
 * does not have to resolve a user document for every row.
 */
export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  text: string;
  /** ID of the parent message when this is a thread reply, otherwise `null`. */
  threadParentId: string | null;
  createdAt: Timestamp | null;
  /** Set once the message has been edited after sending. */
  editedAt: Timestamp | null;
  reactions: MessageReaction[];
  /** Number of thread replies, kept on the parent message. */
  replyCount: number;
  lastReplyAt: Timestamp | null;
}

/** A {@link ChatMessage} without its `id`, as stored in Firestore. */
export type ChatMessageDocument = Omit<ChatMessage, 'id'>;
