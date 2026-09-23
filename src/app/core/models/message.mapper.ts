import { DocumentData, Timestamp } from 'firebase/firestore';
import { ChatMessage, ChatMessageDocument } from './message.model';
import { MessageReaction } from './reaction.model';

/**
 * Converts a raw Firestore document into a {@link ChatMessage}.
 *
 * @param id - The document id.
 * @param value - The raw document data.
 * @returns The mapped message with defaults for missing fields.
 *
 * @remarks
 * Shared by the message, thread and search services so all three read the
 * same shape out of Firestore.
 */
export function mapChatMessage(id: string, value: DocumentData): ChatMessage {
  const data = value as Partial<ChatMessageDocument>;

  return {
    id,
    authorId: data.authorId || '',
    authorName: data.authorName || 'Unbekannter Nutzer',
    authorPhotoURL: data.authorPhotoURL || '/img/Profile_Guest.png',
    text: data.text || '',
    threadParentId: data.threadParentId || null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
    editedAt: data.editedAt instanceof Timestamp ? data.editedAt : null,
    reactions: readReactions(data.reactions),
    replyCount: typeof data.replyCount === 'number' ? data.replyCount : 0,
    lastReplyAt: data.lastReplyAt instanceof Timestamp ? data.lastReplyAt : null,
  };
}

/**
 * Reads the reactions array defensively.
 *
 * @param value - The raw `reactions` field.
 * @returns Valid reactions only; malformed entries are dropped.
 */
export function readReactions(value: unknown): MessageReaction[] {
  return Array.isArray(value) ? (value as MessageReaction[]) : [];
}
