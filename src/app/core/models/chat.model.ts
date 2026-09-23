import { Timestamp } from 'firebase/firestore';

/** Distinguishes public channels from private direct message conversations. */
export type ChatType = 'channel' | 'direct';

/**
 * A chat stored in the `chats` collection — either a channel or a direct message.
 *
 * @remarks
 * Both kinds share this model so that messages, members and threads can be
 * handled by the same services regardless of type.
 */
export interface Chat {
  id: string;
  type: ChatType;
  /** Empty for direct messages, where the other participant's name is shown instead. */
  name: string;
  description: string;
  /** UID of the user who created the chat. */
  createdBy: string;
  /** UIDs of all members; determines access and visibility. */
  memberIds: string[];
  /** Controls whether an empty direct message shows up in the sidebar. */
  hasMessages: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** A {@link Chat} without its `id`, as stored in Firestore. */
export type ChatDocument = Omit<Chat, 'id'>;
