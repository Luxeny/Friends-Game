import { isCustomAvatarId } from "@/lib/customAvatar";
import { DEFAULT_AVATAR_ID } from "@/lib/placeholderAvatar";

export { DEFAULT_AVATAR_ID };

export function normalizeAvatarId(id: string | undefined): string {
  if (id && isCustomAvatarId(id)) return id;
  return DEFAULT_AVATAR_ID;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().slice(0, 8);
}

export function roomInvitePath(code: string): string {
  return `/join/${normalizeRoomCode(code)}`;
}

export function roomInviteUrl(code: string): string {
  if (typeof window === "undefined") {
    return roomInvitePath(code);
  }
  return `${window.location.origin}${roomInvitePath(code)}`;
}

export function copyRoomLink(code: string) {
  const url = roomInviteUrl(code);
  navigator.clipboard.writeText(url);
  return url;
}
