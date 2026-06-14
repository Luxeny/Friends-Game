"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getSocket } from "@/lib/socket";

const WORD_MS = 220;
const HOLD_MS = 1500;
const FADE_MS = 450;
const FINAL_HOLD_MS = 1400;
const SOFT_GLITCH_MS = 900;
const HARD_GLITCH_MS = 1100;
const EMPHASIS_HOLD_MS = 1800;

type Phase = "typing" | "holding" | "fading" | "final-soft" | "final-hard";

export function GameCutscene({
  code,
  playerId,
  playerCount,
  skipVotes,
  skipEvent,
  phrases,
  finale = "simple",
  onComplete,
}: {
  code: string;
  playerId: string;
  playerCount: number;
  skipVotes: string[];
  skipEvent: "game:intro-skip" | "game:mid-skip";
  phrases: string[];
  finale?: "glitch" | "emphasis" | "simple";
  onComplete: () => void;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  const phrase = phrases[phraseIndex];
  const words = phrase.split(" ");
  const isFinal = phraseIndex === phrases.length - 1;
  const hasVoted = skipVotes.includes(playerId);
  const allSkipped = skipVotes.length >= playerCount;

  const darken = Math.min(0.9, (phraseIndex / Math.max(phrases.length - 1, 1)) * 0.9);

  const requestSkip = useCallback(() => {
    if (hasVoted) return;
    getSocket().emit(skipEvent, { code, playerId });
  }, [code, playerId, hasVoted, skipEvent]);

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
      if (finale === "glitch") {
        const t = setTimeout(() => setPhase("final-soft"), FINAL_HOLD_MS);
        return () => clearTimeout(t);
      }
      if (finale === "emphasis") {
        const t = setTimeout(onComplete, EMPHASIS_HOLD_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(onComplete, HOLD_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setPhase("fading"), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, isFinal, finale, onComplete]);

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
    if (phase !== "final-soft") return;
    const t = setTimeout(() => setPhase("final-hard"), SOFT_GLITCH_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "final-hard") return;
    const t = setTimeout(onComplete, HARD_GLITCH_MS);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const lineClass = [
    "game-intro-line",
    isFinal && finale === "glitch" ? " game-intro-line-final" : "",
    isFinal && finale === "emphasis" ? " game-intro-line-emphasis" : "",
    phase === "fading" ? " game-intro-line-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const introClass = [
    "game-intro",
    phase === "fading" ? "game-intro-fading" : "",
    phase === "final-soft" ? "game-intro-soft-glitch" : "",
    phase === "final-hard" ? "game-intro-hard-glitch" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={introClass} style={{ "--intro-dark": darken } as CSSProperties}>
      <div className="game-intro-noise" aria-hidden />
      <div className="game-intro-scanlines" aria-hidden />
      <div className="game-intro-content">
        <p className={lineClass}>
          {words.slice(0, wordCount).map((word, i) => (
            <span key={`${phraseIndex}-${i}`} className="game-intro-word">
              {word}
            </span>
          ))}
        </p>
      </div>

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
