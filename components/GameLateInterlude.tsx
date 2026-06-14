"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getSocket } from "@/lib/socket";

const LATE_PHRASES = [
  "Вы всё ещё здесь. Это либо упрямство, либо отчаяние.",
  "Разница между ними исчезает, когда ответы даются тяжелее с каждым разом.",
  "Три вопроса отделяют вас от правды.",
  "Или от её окончательного отрицания.",
  "Это так будоражит.",
];

const WORD_MS = 220;
const HOLD_MS = 1500;
const FADE_MS = 450;
const FINAL_HOLD_MS = 1200;
const LAUGHTER_BUILD_MS = 900;
const LAUGHTER_CHAOS_MS = 2400;

const MARQUEE_LANES = [
  { className: "game-laugh-marquee-top", text: "ХАХАХАХАХ " },
  { className: "game-laugh-marquee-bottom", text: "ХАХАХАХАХ " },
  { className: "game-laugh-marquee-left", text: "ХАХАХАХАХ " },
  { className: "game-laugh-marquee-right", text: "ХАХАХАХАХ " },
  { className: "game-laugh-marquee-diag-a", text: "ХАХАХАХАХ " },
  { className: "game-laugh-marquee-diag-b", text: "ХАХАХАХАХ " },
];

type Phase = "typing" | "holding" | "fading" | "laughter-build" | "laughter-chaos";

export function GameLateInterlude({
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
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  const phrase = LATE_PHRASES[phraseIndex];
  const words = phrase.split(" ");
  const isFinal = phraseIndex === LATE_PHRASES.length - 1;
  const hasVoted = skipVotes.includes(playerId);
  const allSkipped = skipVotes.length >= playerCount;
  const inLaughter = phase === "laughter-build" || phase === "laughter-chaos";

  const darken = inLaughter ? 0.95 : Math.min(0.85, 0.35 + phraseIndex * 0.12);

  const requestSkip = useCallback(() => {
    if (hasVoted) return;
    getSocket().emit("game:late-skip", { code, playerId });
  }, [code, playerId, hasVoted]);

  useEffect(() => {
    if (!allSkipped) return;
    onComplete();
  }, [allSkipped, onComplete]);

  useEffect(() => {
    if (phase !== "typing") return;
    if (wordCount >= words.length) {
      setPhase("holding");
      return;
    }
    const t = setTimeout(() => setWordCount((c) => c + 1), WORD_MS);
    return () => clearTimeout(t);
  }, [phase, wordCount, words.length]);

  useEffect(() => {
    if (phase !== "holding") return;

    if (isFinal) {
      const t = setTimeout(() => setPhase("laughter-build"), FINAL_HOLD_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setPhase("fading"), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, isFinal]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => {
      setPhraseIndex((i) => i + 1);
      setWordCount(0);
      setPhase("typing");
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "laughter-build") return;
    const t = setTimeout(() => setPhase("laughter-chaos"), LAUGHTER_BUILD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "laughter-chaos") return;
    const t = setTimeout(onComplete, LAUGHTER_CHAOS_MS);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const rootClass = [
    "game-intro",
    "game-laugh-cutscene",
    "game-late-horror",
    phase === "fading" ? "game-intro-fading" : "",
    phase === "laughter-build" ? "game-laugh-build" : "",
    phase === "laughter-chaos" ? "game-laugh-chaos" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={{ "--intro-dark": darken } as CSSProperties}>
      <div className="game-late-horror-vignette" aria-hidden />
      <div className="game-intro-noise" aria-hidden />
      <div className="game-intro-scanlines" aria-hidden />
      <div className="game-laugh-glitch-bars" aria-hidden />

      {!inLaughter && (
        <div className="game-intro-content">
          <p
            className={`game-intro-line game-late-line${phase === "fading" ? " game-intro-line-out" : ""}`}
          >
            {words.slice(0, wordCount).map((word, i) => (
              <span key={`${phraseIndex}-${i}`} className="game-intro-word">
                {word}
              </span>
            ))}
          </p>
        </div>
      )}

      {inLaughter && (
        <div className="game-laugh-stage" aria-hidden>
          <p className="game-laugh-center">ХАХАХАХАХ</p>
          {MARQUEE_LANES.map((lane) => (
            <div key={lane.className} className={`game-laugh-marquee ${lane.className}`}>
              <span>{lane.text.repeat(18)}</span>
              <span>{lane.text.repeat(18)}</span>
            </div>
          ))}
        </div>
      )}

      <footer className="game-intro-footer">
        <button
          type="button"
          className="pixel-btn game-intro-skip-btn"
          onClick={requestSkip}
          disabled={hasVoted}
        >
          {hasVoted ? "Ждём друга…" : "Пропустить"}
        </button>
        <p className="game-intro-skip-hint">
          {hasVoted
            ? `Готово: ${skipVotes.length}/${playerCount}`
            : "Оба игрока должны нажать, чтобы пропустить"}
        </p>
      </footer>
    </div>
  );
}
