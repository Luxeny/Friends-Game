"use client";

import { GameCutscene } from "@/components/GameCutscene";

const MID_PHRASES = [
  "Вы неплохо справляетесь.",
  "Но это лишь начало.",
  "Вы либо пожалеете, что решили продолжить.",
  "Либо укрепите то, что называете связью.",
  "Хотя… что я говорю.",
  "Дальше будет только сложнее.",
  "НАМНОГО.",
];

export function GameMidInterlude({
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
      skipEvent="game:mid-skip"
      phrases={MID_PHRASES}
      finale="glitch"
      onComplete={onComplete}
    />
  );
}
