import { isCustomAvatarId } from "@/lib/customAvatar";
import { DEFAULT_AVATAR_ID } from "@/lib/placeholderAvatar";

export { DEFAULT_AVATAR_ID };

export function normalizeAvatarId(id: string | undefined): string {
  if (id && isCustomAvatarId(id)) return id;
  return DEFAULT_AVATAR_ID;
}

export function copyRoomLink(code: string) {
  const url = `${window.location.origin}/room/${code}`;
  navigator.clipboard.writeText(url);
  return url;
}
