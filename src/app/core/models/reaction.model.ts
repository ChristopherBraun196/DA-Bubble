/** The emoji character itself, for example `"\u2705"`. */
export type ReactionEmoji = string;

/** A user who reacted; the name is carried along for the tooltip. */
export interface ReactionUser {
  id: string;
  name: string;
}

/**
 * All reactions sharing the same emoji on a single message.
 *
 * @remarks
 * The length of `users` is the counter shown below the message.
 */
export interface MessageReaction {
  emoji: ReactionEmoji;
  users: ReactionUser[];
}
