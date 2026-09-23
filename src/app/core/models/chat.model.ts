import { Timestamp } from 'firebase/firestore';

export type ChatType = 'channel' | 'direct';

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  description: string;
  createdBy: string;
  memberIds: string[];
  hasMessages: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ChatDocument = Omit<Chat, 'id'>;
