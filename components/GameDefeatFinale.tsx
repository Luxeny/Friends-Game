"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getSocket } from "@/lib/socket";

const WORD_MS = 170;
const ERROR_GRID_COLS = 11;
const ERROR_GRID_ROWS = 10;
const ERROR_LAYER_CAP = ERROR_GRID_COLS * ERROR_GRID_ROWS;
const ERROR_LAYER_CAP_INTENSE = ERROR_GRID_COLS * 14;

type LineEffect = "red-flash";

type LineBeat = {
  kind: "line";
  text: string;
  holdMs: number;
  effect?: LineEffect;
  lineClass?: string;
};

type Beat =
  | { kind: "error-storm"; ms: number; intense?: boolean }
  | { kind: "pause"; ms: number }
  | LineBeat
  | { kind: "error-single"; ms: number };

const BEATS: Beat[] = [
  { kind: "error-storm", ms: 3600 },
  { kind: "line", text: "Эта попытка — доказать что?", holdMs: 2400 },
  { kind: "pause", ms: 1700 },
  { kind: "line", text: "Что вы друзья?", holdMs: 2100, effect: "red-flash" },
  {
    kind: "line",
    text: "Тогда почему вы не знаете такие простые ответы?",
    holdMs: 2800,
  },
  { kind: "line", text: "На столь же лёгкие вопросы?", holdMs: 2400 },
  { kind: "line", text: "Вы никто друг другу.", holdMs: 2600 },
  { kind: "line", text: "Забудьте, вам не понять что такое...", holdMs: 3000 },
  { kind: "line", text: "Дружба.", holdMs: 2800, lineClass: "game-defeat-line-final" },
  { kind: "error-storm", ms: 3200, intense: true },
  { kind: "error-single", ms: 4800 },
];

type Phase = "error-storm" | "typing" | "holding" | "pause" | "error-single";

function layerStyle(i: number): CSSProperties {
  const col = i % ERROR_GRID_COLS;
  const row = Math.floor(i / ERROR_GRID_COLS) % ERROR_GRID_ROWS;
  const jitterX = ((i * 13) % 7) - 3;
  const jitterY = ((i * 19) % 7) - 3;
  const scale = 0.72 + ((i * 7) % 5) * 0.08;

  return {
    left: `calc(${1.5 + col * 8.6}% + ${jitterX}px)`,
    top: `calc(${1 + row * 9.2}% + ${jitterY}px)`,
    transform: `scale(${scale})`,
    animationDelay: `${i * 0.022}s`,
  };
}

function layerVariant(i: number): string {
  return `game-defeat-error-v${i % 4}`;
}

function ErrorStorm({
  layers,
  intense,
}: {
  layers: number;
  intense?: boolean;
}) {
  const items = useMemo(() => Array.from({ length: layers }, (_, i) => i), [layers]);

  return (
    <div
      className={`game-defeat-errors${intense ? " game-defeat-errors-intense" : ""}`}
      aria-hidden
    >
      {items.map((i) => (
        <span
          key={i}
          className={`game-defeat-error-layer ${layerVariant(i)}`}
          style={layerStyle(i)}
        >
          ОШИБКА
        </span>
      ))}
    </div>
  );
}

export function GameDefeatFinale({
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
  const [beatIndex, setBeatIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("error-storm");
  const [wordCount, setWordCount] = useState(0);
  const [activeEffect, setActiveEffect] = useState<LineEffect | null>(null);
  const [errorLayers, setErrorLayers] = useState(0);

  const beat = BEATS[beatIndex];
  const lineBeat = beat?.kind === "line" ? beat : null;
  const words = lineBeat ? lineBeat.text.split(" ") : [];
  const hasVoted = skipVotes.includes(playerId);
  const allSkipped = skipVotes.length >= playerCount;
  const inDialogue = phase === "typing" || phase === "holding";
  const showErrors = phase === "error-storm" || (inDialogue && errorLayers > 0);
  const stormBeat = beat?.kind === "error-storm" ? beat : null;
  const intenseStorm = stormBeat?.intense === true;

  const requestSkip = useCallback(() => {
    if (hasVoted) return;
    getSocket().emit("game:defeat-skip", { code, playerId });
  }, [code, playerId, hasVoted]);

  const goToBeat = useCallback((index: number) => {
    const next = BEATS[index];
    if (!next) {
      onComplete();
      return;
    }
    setBeatIndex(index);
    setWordCount(0);
    setActiveEffect(null);
    if (next.kind === "error-storm") {
      setErrorLayers(0);
      setPhase("error-storm");
    } else if (next.kind === "pause") {
      setPhase("pause");
    } else if (next.kind === "error-single") {
      setPhase("error-single");
    } else {
      setPhase("typing");
    }
  }, [onComplete]);

  useEffect(() => {
    if (!allSkipped) return;
    onComplete();
  }, [allSkipped, onComplete]);

  useEffect(() => {
    if (phase !== "error-storm" || !stormBeat) return;

    const cap = intenseStorm ? ERROR_LAYER_CAP_INTENSE : ERROR_LAYER_CAP;
    const start = Date.now();

    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / stormBeat.ms);
      setErrorLayers(Math.max(1, Math.floor(progress * cap)));
    }, 32);

    const done = window.setTimeout(() => {
      goToBeat(beatIndex + 1);
    }, stormBeat.ms);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [phase, beatIndex, stormBeat, intenseStorm, goToBeat]);

  useEffect(() => {
    if (phase !== "pause") return;
    const pauseBeat = BEATS[beatIndex];
    if (pauseBeat?.kind !== "pause") return;
    const t = window.setTimeout(() => goToBeat(beatIndex + 1), pauseBeat.ms);
    return () => window.clearTimeout(t);
  }, [phase, beatIndex, goToBeat]);

  useEffect(() => {
    if (phase !== "typing" || !lineBeat) return;
    if (wordCount >= words.length) {
      setPhase("holding");
      setActiveEffect(lineBeat.effect ?? null);
      return;
    }
    const t = window.setTimeout(() => setWordCount((c) => c + 1), WORD_MS);
    return () => window.clearTimeout(t);
  }, [phase, wordCount, words.length, lineBeat]);

  useEffect(() => {
    if (phase !== "holding" || !lineBeat) return;
    const t = window.setTimeout(() => {
      setActiveEffect(null);
      goToBeat(beatIndex + 1);
    }, lineBeat.holdMs);
    return () => window.clearTimeout(t);
  }, [phase, beatIndex, lineBeat, goToBeat]);

  useEffect(() => {
    if (phase !== "error-single") return;
    const singleBeat = BEATS[beatIndex];
    if (singleBeat?.kind !== "error-single") return;
    const t = window.setTimeout(onComplete, singleBeat.ms);
    return () => window.clearTimeout(t);
  }, [phase, beatIndex, onComplete]);

  useEffect(() => {
    if (phase === "error-storm") return;
    if (inDialogue) {
      setErrorLayers(18);
      return;
    }
    if (phase === "pause") {
      setErrorLayers(6);
    }
  }, [phase, inDialogue]);

  const rootClass = [
    "game-intro",
    "game-defeat",
    "game-late-horror",
    phase === "error-storm" ? "game-defeat-storm-active" : "",
    intenseStorm && phase === "error-storm" ? "game-defeat-storm-intense" : "",
    inDialogue ? "game-defeat-dialogue" : "",
    phase === "pause" ? "game-defeat-pause" : "",
    activeEffect === "red-flash" ? "game-defeat-red-flash" : "",
    phase === "error-single" ? "game-defeat-error-single" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lineClass = [
    "game-intro-line",
    "game-defeat-line",
    lineBeat?.lineClass ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={{ "--intro-dark": 0.96 } as CSSProperties}>
      <div className="game-late-horror-vignette" aria-hidden />
      <div className="game-intro-noise" aria-hidden />
      <div className="game-intro-scanlines" aria-hidden />
      <div className="game-laugh-glitch-bars" aria-hidden />
      <div className="game-defeat-red-overlay" aria-hidden />
      {(phase === "error-storm") && (
        <div className="game-defeat-screen-shatter" aria-hidden />
      )}

      {showErrors && (
        <ErrorStorm layers={errorLayers} intense={intenseStorm && phase === "error-storm"} />
      )}

      {phase === "error-single" && (
        <div className="game-defeat-single-error-wrap" aria-hidden>
          <span className="game-defeat-single-error">ОШИБКА</span>
        </div>
      )}

      {inDialogue && lineBeat && (
        <div className="game-intro-content game-defeat-content">
          <p className={lineClass}>
            {words.slice(0, wordCount).map((word, i) => (
              <span key={`${beatIndex}-${i}`} className="game-intro-word">
                {word}
              </span>
            ))}
          </p>
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
