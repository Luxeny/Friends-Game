export const AVATAR_GRID = 15;

export const AVATAR_PALETTE = [
  "#052e16",
  "#166534",
  "#22c55e",
  "#4ade80",
  "#86efac",
  "#bbf7d0",
  "#ffffff",
] as const;

export type PixelGrid = number[][];

export function emptyGrid(): PixelGrid {
  return Array.from({ length: AVATAR_GRID }, () =>
    Array.from({ length: AVATAR_GRID }, () => 0)
  );
}

export function isCustomAvatarId(id: string): boolean {
  return id.startsWith("custom:");
}

export function encodeCustomAvatar(grid: PixelGrid): string {
  const flat = grid.flat().map((n) => Math.min(7, Math.max(0, n | 0)));
  if (flat.length !== AVATAR_GRID * AVATAR_GRID) {
    throw new Error("Invalid grid size");
  }
  const raw = flat.map((n) => String.fromCharCode(48 + n)).join("");
  return `custom:${btoa(raw)}`;
}

export function decodeCustomAvatar(id: string): PixelGrid | null {
  if (!isCustomAvatarId(id)) return null;
  try {
    const raw = atob(id.slice(7));
    if (raw.length !== AVATAR_GRID * AVATAR_GRID) return null;
    const flat = [...raw].map((ch) => {
      const code = ch.charCodeAt(0) - 48;
      return code >= 0 && code <= 7 ? code : 0;
    });
    const grid: PixelGrid = [];
    for (let y = 0; y < AVATAR_GRID; y++) {
      grid.push(flat.slice(y * AVATAR_GRID, (y + 1) * AVATAR_GRID));
    }
    return grid;
  } catch {
    return null;
  }
}

export function gridToColors(grid: PixelGrid): (string | null)[][] {
  return grid.map((row) =>
    row.map((idx) => (idx > 0 ? AVATAR_PALETTE[idx - 1] : null))
  );
}
