"use client";

import {
  AVATAR_GRID,
  decodeCustomAvatar,
  emptyGrid,
  gridToColors,
  isCustomAvatarId,
} from "@/lib/customAvatar";
import { getPlaceholderColors } from "@/lib/placeholderAvatar";
import {
  PENCIL_ICON_PIXELS,
  PENCIL_ICON_SIZE,
} from "@/lib/pencilIcon";
import { PixelAvatarEditor } from "@/components/PixelAvatarEditor";
import { useState } from "react";

function ColorGridSvg({
  colors,
  dim,
  glow,
}: {
  colors: (string | null)[][];
  dim: number;
  glow: boolean;
}) {
  const h = colors.length;
  const w = colors[0]?.length || AVATAR_GRID;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${w} ${h}`}
      className={`avatar-sprite ${glow ? "avatar-sprite-glow" : ""}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {colors.map((row, y) =>
        row.map((color, x) =>
          color ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
          ) : null
        )
      )}
    </svg>
  );
}

export function AvatarSprite({
  id,
  size = "md",
  glow = false,
}: {
  id: string;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}) {
  const dim = size === "lg" ? 96 : size === "md" ? 72 : 48;

  if (isCustomAvatarId(id)) {
    const grid = decodeCustomAvatar(id);
    if (grid) {
      return <ColorGridSvg colors={gridToColors(grid)} dim={dim} glow={glow} />;
    }
  }

  return <ColorGridSvg colors={getPlaceholderColors()} dim={dim} glow={glow} />;
}

function PixelPencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox={`0 0 ${PENCIL_ICON_SIZE} ${PENCIL_ICON_SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {PENCIL_ICON_PIXELS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

export function AvatarPicker({
  avatarId,
  onAvatarChange,
}: {
  avatarId: string;
  onAvatarChange: (avatarId: string) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const editorGrid = decodeCustomAvatar(avatarId) || emptyGrid();

  const openEditor = () => setEditorOpen(true);

  return (
    <>
      <div className="avatar-picker">
        <div className="avatar-frame avatar-frame-lg avatar-frame-interactive">
          <button
            type="button"
            className="avatar-frame-hit"
            onClick={openEditor}
            aria-label="Нарисовать аватар"
          >
            <AvatarSprite id={avatarId} size="lg" glow />
          </button>
          <button
            type="button"
            className="avatar-edit"
            onClick={openEditor}
            aria-label="Нарисовать аватар"
            title="Нарисовать аватар"
          >
            <PixelPencilIcon />
          </button>
        </div>
      </div>

      <PixelAvatarEditor
        open={editorOpen}
        initialGrid={editorGrid}
        onSave={(id) => {
          onAvatarChange(id);
          setEditorOpen(false);
        }}
        onClose={() => setEditorOpen(false)}
      />
    </>
  );
}
