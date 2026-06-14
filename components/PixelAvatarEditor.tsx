"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AVATAR_GRID,
  AVATAR_PALETTE,
  emptyGrid,
  encodeCustomAvatar,
  type PixelGrid,
} from "@/lib/customAvatar";

export function PixelAvatarEditor({
  open,
  initialGrid,
  onSave,
  onClose,
}: {
  open: boolean;
  initialGrid: PixelGrid;
  onSave: (avatarId: string, grid: PixelGrid) => void;
  onClose: () => void;
}) {
  const [grid, setGrid] = useState<PixelGrid>(initialGrid);
  const [colorIdx, setColorIdx] = useState(3);
  const [eraser, setEraser] = useState(false);
  const painting = useRef(false);

  useEffect(() => {
    if (open) {
      setGrid(initialGrid.map((row) => [...row]));
      setEraser(false);
    }
  }, [open, initialGrid]);

  const applyPixel = useCallback(
    (x: number, y: number, toggle: boolean) => {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        const current = next[y][x];
        if (eraser) {
          next[y][x] = 0;
          return next;
        }
        if (toggle && current > 0) {
          next[y][x] = 0;
        } else {
          next[y][x] = colorIdx + 1;
        }
        return next;
      });
    },
    [colorIdx, eraser]
  );

  const handlePointerDown = (x: number, y: number) => {
    painting.current = true;
    applyPixel(x, y, true);
  };

  const handlePointerEnter = (x: number, y: number) => {
    if (painting.current) {
      applyPixel(x, y, false);
    }
  };

  const stopPainting = () => {
    painting.current = false;
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("mouseup", stopPainting);
    window.addEventListener("touchend", stopPainting);
    return () => {
      window.removeEventListener("mouseup", stopPainting);
      window.removeEventListener("touchend", stopPainting);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="pixel-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="pixel-modal panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Редактор аватара"
      >
        <h2 className="pixel-modal-title">Пиксельный аватар</h2>
        <p className="pixel-modal-hint">
          Зажми и води — рисовать. Клик — закрасить / стереть пиксель.
        </p>

        <div className="pixel-editor-toolbar">
          <div className="pixel-editor-colors">
            {AVATAR_PALETTE.map((color, i) => (
              <button
                key={color}
                type="button"
                className={`pixel-color-swatch ${!eraser && colorIdx === i ? "active" : ""}`}
                style={{ background: color }}
                onClick={() => {
                  setEraser(false);
                  setColorIdx(i);
                }}
                aria-label={`Цвет ${i + 1}`}
              />
            ))}
            <button
              type="button"
              className={`pixel-color-swatch pixel-eraser ${eraser ? "active" : ""}`}
              onClick={() => setEraser(true)}
              aria-label="Ластик"
              title="Ластик"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            className="pixel-btn pixel-btn-sm"
            onClick={() => setGrid(emptyGrid())}
          >
            Стереть
          </button>
        </div>

        <div
          className="pixel-editor-grid"
          style={{ gridTemplateColumns: `repeat(${AVATAR_GRID}, 1fr)` }}
          onMouseLeave={stopPainting}
        >
          {grid.map((row, y) =>
            row.map((idx, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className="pixel-editor-cell"
                style={{
                  background: idx > 0 ? AVATAR_PALETTE[idx - 1] : "#000",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePointerDown(x, y);
                }}
                onMouseEnter={() => handlePointerEnter(x, y)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handlePointerDown(x, y);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (el?.classList.contains("pixel-editor-cell")) {
                    const key = (el as HTMLElement).dataset.pixel;
                    if (key) {
                      const [px, py] = key.split(",").map(Number);
                      handlePointerEnter(px, py);
                    }
                  }
                }}
                data-pixel={`${x},${y}`}
                aria-label={`Пиксель ${x + 1}, ${y + 1}`}
              />
            ))
          )}
        </div>

        <div className="pixel-modal-actions">
          <button type="button" className="pixel-btn" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="pixel-btn"
            onClick={() => onSave(encodeCustomAvatar(grid), grid)}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
