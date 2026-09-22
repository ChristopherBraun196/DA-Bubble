import { Timestamp } from 'firebase/firestore';
import { MessageReaction } from './reaction.model';

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  text: string;
  threadParentId: string | null;
  createdAt: Timestamp | null;
  editedAt: Timestamp | null;
  reactions: MessageReaction[];
  replyCount: number;
  lastReplyAt: Timestamp | null;
}

export type ChatMessageDocument = Omit<ChatMessage, 'id'>;
