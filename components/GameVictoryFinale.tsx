"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getSocket } from "@/lib/socket";

const WORD_MS = 165;

type LineEffect =
  | "hard-glitch"
  | "face-reload"
  | "pixel-sparks"
  | "stabilize"
  | "silence"
  | "white-flash";

type LineBeat = {
  kind: "line";
  text: string;
  holdMs: number;
  effect?: LineEffect;
  lineClass?: string;
  whiteMode?: boolean;
};

type Beat =
  | { kind: "screamer"; ms: number }
  | LineBeat
  | { kind: "flicker"; ms: number }
  | { kind: "fade"; ms: number };

const BEATS: Beat[] = [
  { kind: "screamer", ms: 2400 },
  { kind: "line", text: "Ч-ч-чёрт...", holdMs: 2200, effect: "hard-glitch" },
  { kind: "line", text: "В-в-ы двое...", holdMs: 2800, effect: "face-reload" },
  { kind: "line", text: "То есть...", holdMs: 2000, effect: "pixel-sparks" },
  {
    kind: "line",
    text: "ваша связь.",
    holdMs: 2400,
    effect: "stabilize",
    lineClass: "game-finale-line-steady",
  },
  {
    kind: "line",
    text: "Я не думала... что такое вообще возможно.",
    holdMs: 3500,
    effect: "silence",
    lineClass: "game-finale-line-soft",
  },
  {
    kind: "line",
    text: "Вы сохранили то, что называете дружбой.",
    holdMs: 4200,
    effect: "silence",
    lineClass: "game-finale-line-soft",
  },
  { kind: "flicker", ms: 900 },
  {
    kind: "line",
    text: "она настоящая",
    holdMs: 2800,
    whiteMode: true,
    lineClass: "game-finale-line-white",
  },
  {
    kind: "line",
    text: "поздравляю",
    holdMs: 2600,
    whiteMode: true,
    lineClass: "game-finale-line-white-final",
  },
  { kind: "fade", ms: 3500 },
];

type Phase = "screamer" | "typing" | "holding" | "flicker" | "fade-out";

const NEKO_SPRITE = "/sprites/neko3.png";

function dispatchMusic(action: "freeze" | "resume") {
  window.dispatchEvent(new CustomEvent("fg-music", { detail: { action } }));
}

export function GameVictoryFinale({
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
  const [phase, setPhase] = useState<Phase>("screamer");
  const [wordCount, setWordCount] = useState(0);
  const [activeEffect, setActiveEffect] = useState<LineEffect | null>(null);
  const [frozenLine, setFrozenLine] = useState<LineBeat | null>(null);

  const beat = BEATS[beatIndex];
  const lineBeat = beat?.kind === "line" ? beat : null;
  const displayBeat = phase === "flicker" ? frozenLine : lineBeat;
  const words = displayBeat ? displayBeat.text.split(" ") : [];
  const hasVoted = skipVotes.includes(playerId);
  const allSkipped = skipVotes.length >= playerCount;
  const inDialogue = phase === "typing" || phase === "holding" || phase === "flicker";
  const isWhiteScreen = Boolean(lineBeat?.whiteMode) || phase === "fade-out";
  const showDialogueNeko =
    (inDialogue || phase === "fade-out") && !isWhiteScreen && phase !== "flicker";
  const visibleWordCount =
    phase === "fade-out" || phase === "flicker" || phase === "holding"
      ? words.length
      : wordCount;
  const bloodPhase =
    inDialogue && !isWhiteScreen && phase !== "screamer" && phase !== "flicker";

  const requestSkip = useCallback(() => {
    if (hasVoted) return;
    getSocket().emit("game:finale-skip", { code, playerId });
  }, [code, playerId, hasVoted]);

  useEffect(() => {
    if (!allSkipped) return;
    onComplete();
  }, [allSkipped, onComplete]);

  useEffect(() => {
    if (phase !== "screamer") return;
    const screamer = BEATS[0];
    if (screamer.kind !== "screamer") return;
    const t = setTimeout(() => {
      setBeatIndex(1);
      setPhase("typing");
    }, screamer.ms);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "typing" || !lineBeat) return;
    if (wordCount >= words.length) {
      setPhase("holding");
      setActiveEffect(lineBeat.effect ?? null);
      return;
    }
    const t = setTimeout(() => setWordCount((c) => c + 1), WORD_MS);
    return () => clearTimeout(t);
  }, [phase, wordCount, words.length, lineBeat]);

  useEffect(() => {
    if (phase !== "holding" || !lineBeat) return;
    const t = setTimeout(() => {
      setActiveEffect(null);
      setWordCount(0);
      const nextIndex = beatIndex + 1;
      const nextBeat = BEATS[nextIndex];
      if (!nextBeat || nextBeat.kind === "fade") {
        setPhase("fade-out");
        return;
      }
      if (nextBeat.kind === "flicker") {
        setFrozenLine(lineBeat);
        setBeatIndex(nextIndex);
        setPhase("flicker");
        return;
      }
      setBeatIndex(nextIndex);
      setPhase("typing");
    }, lineBeat.holdMs);
    return () => clearTimeout(t);
  }, [phase, beatIndex, lineBeat]);

  useEffect(() => {
    if (phase !== "flicker") return;
    const flickerBeat = BEATS[beatIndex];
    if (flickerBeat?.kind !== "flicker") return;
    const t = setTimeout(() => {
      setFrozenLine(null);
      const nextIndex = beatIndex + 1;
      const nextBeat = BEATS[nextIndex];
      if (!nextBeat || nextBeat.kind === "fade") {
        setPhase("fade-out");
        return;
      }
      setBeatIndex(nextIndex);
      setPhase("typing");
    }, flickerBeat.ms);
    return () => clearTimeout(t);
  }, [phase, beatIndex]);

  useEffect(() => {
    if (phase !== "fade-out") return;
    const fadeBeat = BEATS[BEATS.length - 1];
    const ms = fadeBeat.kind === "fade" ? fadeBeat.ms : 3500;
    const t = setTimeout(onComplete, ms);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  useEffect(() => {
    if (activeEffect !== "silence") return;
    dispatchMusic("freeze");
    return () => dispatchMusic("resume");
  }, [activeEffect]);

  useEffect(() => () => dispatchMusic("resume"), []);

  const rootClass = [
    "game-intro",
    "game-finale",
    "game-late-horror",
    phase === "screamer" ? "game-finale-screamer-active" : "",
    bloodPhase ? "game-finale-blood" : "",
    activeEffect === "hard-glitch" ? "game-finale-hard-glitch" : "",
    activeEffect === "face-reload" ? "game-finale-face-reload" : "",
    activeEffect === "pixel-sparks" ? "game-finale-pixel-sparks" : "",
    activeEffect === "stabilize" ? "game-finale-stabilize" : "",
    activeEffect === "silence" ? "game-finale-silence" : "",
    activeEffect === "white-flash" ? "game-finale-white-flash" : "",
    phase === "flicker" ? "game-finale-pre-white-flicker" : "",
    isWhiteScreen ? "game-finale-white-screen" : "",
    phase === "fade-out" ? "game-finale-fade-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lineClass = [
    "game-intro-line",
    !displayBeat?.whiteMode ? "game-finale-line" : "",
    displayBeat?.lineClass ?? "",
    bloodPhase && !displayBeat?.lineClass?.includes("soft")
      ? "game-finale-line-drift"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={{ "--intro-dark": 0.94 } as CSSProperties}>
      <div className="game-late-horror-vignette" aria-hidden />
      <div className="game-intro-noise" aria-hidden />
      <div className="game-intro-scanlines" aria-hidden />
      <div className="game-laugh-glitch-bars" aria-hidden />
      <div className="game-finale-sparks" aria-hidden />
      <div className="game-finale-white-overlay" aria-hidden />
      <div className="game-finale-blood-smear" aria-hidden />

      {phase === "screamer" && (
        <div
          className="game-finale-screamer"
          style={{ "--neko-sprite": `url(${NEKO_SPRITE})` } as CSSProperties}
        >
          <span className="game-finale-screamer-body" aria-hidden />
          <span className="game-finale-screamer-glitch" aria-hidden />
        </div>
      )}

      {showDialogueNeko && phase !== "screamer" && (
        <div
          className="game-finale-neko"
          style={{ "--neko-sprite": `url(${NEKO_SPRITE})` } as CSSProperties}
          aria-hidden
        >
          <span className="game-finale-neko-body" />
        </div>
      )}

      {displayBeat && (inDialogue || phase === "fade-out") && (
        <div className="game-intro-content game-finale-content">
          <p className={lineClass}>
            {words.slice(0, visibleWordCount).map((word, i) => (
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
