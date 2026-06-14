"use client";

import { useEffect } from "react";
import { setBackgroundMusicHorror } from "@/lib/backgroundMusic";

export function MusicHorrorSync({ horror }: { horror: boolean }) {
  useEffect(() => {
    setBackgroundMusicHorror(horror);
    return () => setBackgroundMusicHorror(false);
  }, [horror]);

  return null;
}
