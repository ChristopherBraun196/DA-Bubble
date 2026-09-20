import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  text: string;
  threadParentId: string | null;
  createdAt: Timestamp | null;
  editedAt: Timestamp | null;
}

export type ChatMessageDocument = Omit<ChatMessage, 'id'>;
