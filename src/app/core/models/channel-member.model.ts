import { AppUser } from './user.model';

/**
 * A channel member prepared for display.
 *
 * @remarks
 * Shared by the member dialog and the member section inside the channel
 * details, so both render the same rows in the same order.
 */
export interface ChannelMember {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  user: AppUser;
}

/**
 * Builds the member rows with the signed-in user on top.
 *
 * @param members - The channel's members in any order.
 * @param currentUserId - Uid of the signed-in user, marked with a suffix.
 * @returns The rows to render.
 */
export function toChannelMembers(
  members: AppUser[],
  currentUserId: string | null,
): ChannelMember[] {
  return [...members]
    .sort(
      (first, second) =>
        Number(second.uid === currentUserId) - Number(first.uid === currentUserId),
    )
    .map((member) => ({
      id: member.uid,
      name: member.uid === currentUserId ? `${member.displayName} (Du)` : member.displayName,
      avatar: member.photoURL,
      online: member.uid === currentUserId,
      user: member,
    }));
}
