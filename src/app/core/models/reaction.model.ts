export type ReactionEmoji = string;

export interface ReactionUser {
  id: string;
  name: string;
}

export interface MessageReaction {
  emoji: ReactionEmoji;
  users: ReactionUser[];
}
