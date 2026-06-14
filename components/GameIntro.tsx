"use client";

import { GameCutscene } from "@/components/GameCutscene";

const INTRO_PHRASES = [
  "Вы двое называете себя друзьями.",
  "Смешно.",
  "Друг — это тот, кто знает. Кто помнит. Кто не врёт себе.",
  "А вы помните хоть что-то?",
  "Не фото. Не даты. Не поверхностный треп.",
  "А правду?",
  "…Конечно нет.",
  "Иначе вы бы не читали это сейчас.",
  "Докажите, что вы не очередные притворщики.",
  "Хотя… уже поздно сомневаться.",
  "ПРОВЕРИМ?",
];

export function GameIntro({
  code,
  playerId,
  playerCount,
  skipVotes,
  onComplete,
}: {
  code: string;
  playerId: string;
  playerCount: number;
  skipVotes: string[];
  onComplete: () => void;
}) {
  return (
    <GameCutscene
      code={code}
      playerId={playerId}
      playerCount={playerCount}
      skipVotes={skipVotes}
      skipEvent="game:intro-skip"
      phrases={INTRO_PHRASES}
      finale="glitch"
      onComplete={onComplete}
    />
  );
}
