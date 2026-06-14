import {
  AVATAR_GRID,
  gridToColors,
  type PixelGrid,
} from "./customAvatar";

export const DEFAULT_AVATAR_ID = "default";

/** Заглушка-смайл из smile.aseprite — только для отображения, не для редактора */
const SMILE_GRID: PixelGrid = [
  [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0],
  [0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0],
  [0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0],
  [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4],
  [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
  [0, 4, 4, 0, 0, 0, 4, 4, 4, 0, 0, 0, 4, 4, 0],
  [0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0],
  [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0],
];

export function getPlaceholderColors() {
  return gridToColors(SMILE_GRID);
}

export function isDefaultAvatar(id: string): boolean {
  return id === DEFAULT_AVATAR_ID || id === "placeholder";
}
