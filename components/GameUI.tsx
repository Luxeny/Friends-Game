"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  questionTokens,
  splitHighlightNames,
  splitQuestionSegments,
} from "@/shared/gameQuestion";

export function NekoLine({
  text,
  highlightNames = [],
  className = "game-neko-line",
}: {
  text: string;
  highlightNames?: string[];
  className?: string;
}) {
  const segments = splitHighlightNames(text, highlightNames);

  return (
    <p className={className}>
      {segments.map((segment, i) =>
        segment.highlight ? (
          <span key={i} className="game-player-name">
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </p>
  );
}

export function QuestionReveal({
  text,
  highlightName = "",
  delayMs = 280,
  className = "",
  onComplete,
}: {
  text: string;
  highlightName?: string;
  delayMs?: number;
  className?: string;
  onComplete?: () => void;
}) {
  const tokens = questionTokens(text, highlightName);

  useEffect(() => {
    if (!onComplete || tokens.length === 0) return;
    const animMs = 350;
    const totalMs = Math.max(0, (tokens.length - 1) * delayMs) + animMs;
    const t = setTimeout(onComplete, totalMs);
    return () => clearTimeout(t);
  }, [text, highlightName, delayMs, onComplete, tokens.length]);

  return (
    <p className={`word-reveal ${className}`.trim()}>
      {tokens.map((token, i) => (
        <span
          key={`${token.text}-${i}`}
          className={token.highlight ? "game-question-name" : undefined}
          style={{ animationDelay: `${i * delayMs}ms`, marginRight: "0.35em" }}
        >
          {token.text}
        </span>
      ))}
    </p>
  );
}

export function QuestionStatic({
  text,
  highlightName = "",
  className = "",
}: {
  text: string;
  highlightName?: string;
  className?: string;
}) {
  const segments = splitQuestionSegments(text, highlightName);

  return (
    <p className={className}>
      {segments.map((segment, i) =>
        segment.highlight ? (
          <span key={i} className="game-question-name">
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </p>
  );
}

/** @deprecated Use QuestionReveal */
export function WordReveal({
  text,
  delayMs = 280,
  className = "",
  onComplete,
}: {
  text: string;
  delayMs?: number;
  className?: string;
  onComplete?: () => void;
}) {
  return (
    <QuestionReveal
      text={text}
      delayMs={delayMs}
      className={className}
      onComplete={onComplete}
    />
  );
}

export function TamagotchiHost() {
  return <PixelNekoHost />;
}

function nekoSpriteForRound(round: number): string {
  if (round <= 3) return "/sprites/neko1.png";
  if (round <= 7) return "/sprites/neko2.png";
  return "/sprites/neko3.png";
}

export function PixelNekoHost({ round = 1 }: { round?: number }) {
  const tier = round <= 3 ? 1 : round <= 7 ? 2 : 3;
  const sprite = nekoSpriteForRound(round);

  return (
    <div className={`pixel-neko pixel-neko-tier-${tier}`}>
      <div
        key={sprite}
        className="pixel-neko-frame"
        style={{ "--neko-sprite": `url(${sprite})` } as CSSProperties}
        role="img"
        aria-label="Neko"
      >
        <span className="pixel-neko-body" aria-hidden />
        {tier === 3 && <span className="pixel-neko-glitch" aria-hidden />}
      </div>
    </div>
  );
}

export function LivesDisplay({ lives, max }: { lives: number; max: number }) {
  return (
    <div className="lives" aria-label={`Жизни: ${lives}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`life-pixel ${i >= lives ? "lost" : ""}`} aria-hidden>
          <svg width="14" height="12" viewBox="0 0 7 6" shapeRendering="crispEdges">
            <rect x="1" y="1" width="1" height="1" fill="currentColor" />
            <rect x="2" y="0" width="3" height="1" fill="currentColor" />
            <rect x="5" y="1" width="1" height="1" fill="currentColor" />
            <rect x="0" y="2" width="1" height="2" fill="currentColor" />
            <rect x="6" y="2" width="1" height="2" fill="currentColor" />
            <rect x="1" y="4" width="1" height="1" fill="currentColor" />
            <rect x="5" y="4" width="1" height="1" fill="currentColor" />
            <rect x="2" y="5" width="3" height="1" fill="currentColor" />
            <rect x="3" y="2" width="1" height="2" fill="currentColor" />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function useCountdown(
  active: boolean,
  seconds: number,
  onExpire: () => void,
  resetKey: string | number
) {
  const [left, setLeft] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active || seconds <= 0) {
      return;
    }
    setLeft(seconds);
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          onExpireRef.current();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active, seconds, resetKey]);

  return left;
}
