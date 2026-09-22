import { Timestamp } from 'firebase/firestore';

export interface MessageSearchResult {
  chatId: string;
  messageId: string;
  text: string;
  authorName: string;
  createdAt: Timestamp;
}
