import { DocumentData, Timestamp } from 'firebase/firestore';
import { ChatMessage, ChatMessageDocument } from './message.model';
import { MessageReaction } from './reaction.model';

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

export function readReactions(value: unknown): MessageReaction[] {
  return Array.isArray(value) ? (value as MessageReaction[]) : [];
}
