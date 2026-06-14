"use client";

import { useEffect, useState } from "react";
import { MusicIcon } from "@/components/PixelIcons";
import {
  getBackgroundMusicState,
  initBackgroundMusicEvents,
  subscribeBackgroundMusic,
  toggleBackgroundMusic,
} from "@/lib/backgroundMusic";

export function GlobalBackgroundMusic() {
  const [music, setMusic] = useState(getBackgroundMusicState);

  useEffect(() => subscribeBackgroundMusic(() => setMusic(getBackgroundMusicState())), []);
  useEffect(() => initBackgroundMusicEvents(), []);

  return (
    <div className={`music-fab${music.horror ? " music-fab-horror" : ""}`}>
      <button
        type="button"
        className={`pixel-btn icon-only music-toggle${music.playing ? " music-toggle-on" : ""}`}
        onClick={toggleBackgroundMusic}
        aria-label={music.playing ? "Выключить музыку" : "Включить музыку"}
        title={music.playing ? "Выключить музыку" : "Включить музыку"}
      >
        <MusicIcon active={music.playing} />
      </button>
    </div>
  );
}
