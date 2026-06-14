"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarSprite } from "@/components/AvatarSprite";
import { GameIntro } from "@/components/GameIntro";
import { GameMidInterlude } from "@/components/GameMidInterlude";
import { GameLateInterlude } from "@/components/GameLateInterlude";
import { GameVictoryFinale } from "@/components/GameVictoryFinale";
import { GameDefeatFinale } from "@/components/GameDefeatFinale";
import {
  LivesDisplay,
  NekoLine,
  PixelNekoHost,
  QuestionReveal,
  QuestionStatic,
  useCountdown,
} from "@/components/GameUI";
import { getSocket } from "@/lib/socket";
import { formatQuestionForPlayer } from "@/shared/gameQuestion";
import type { Room } from "@/shared/types";

function introStorageKey(code: string) {
  return `fg-intro-${code}`;
}

function midStorageKey(code: string, playerId: string) {
  return `fg-mid-${code}-${playerId}`;
}

function lateStorageKey(code: string, playerId: string) {
  return `fg-late-${code}-${playerId}`;
}

function finaleStorageKey(code: string) {
  return `fg-finale-${code}`;
}

function defeatStorageKey(code: string) {
  return `fg-defeat-${code}`;
}

export function KnowEachOtherGame({
  room,
  playerId,
  code,
}: {
  room: Room;
  playerId: string;
  code: string;
}) {
  const gs = room.gameState!;
  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);

  const [aboutSelf, setAboutSelf] = useState("");
  const [aboutFriend, setAboutFriend] = useState("");
  const [introDoneLocal, setIntroDoneLocal] = useState(false);
  const [finaleDoneLocal, setFinaleDoneLocal] = useState(false);
  const [defeatDoneLocal, setDefeatDoneLocal] = useState(false);
  const [questionReady, setQuestionReady] = useState(false);

  const aboutSelfRef = useRef(aboutSelf);
  const aboutFriendRef = useRef(aboutFriend);
  const mySubmittedRef = useRef(false);

  aboutSelfRef.current = aboutSelf;
  aboutFriendRef.current = aboutFriend;

  const skipVotes = gs.introSkipVotes ?? [];
  const midSkipVotes = gs.midSkipVotes ?? [];
  const midInterludeDoneBy = gs.midInterludeDoneBy ?? [];
  const lateSkipVotes = gs.lateSkipVotes ?? [];
  const lateInterludeDoneBy = gs.lateInterludeDoneBy ?? [];
  const finaleSkipVotes = gs.finaleSkipVotes ?? [];
  const defeatSkipVotes = gs.defeatSkipVotes ?? [];
  const playerCount = room.players.length;
  const serverIntroSkipped =
    playerCount > 0 && skipVotes.length >= playerCount;
  const serverFinaleSkipped =
    playerCount > 0 && finaleSkipVotes.length >= playerCount;
  const serverDefeatSkipped =
    playerCount > 0 && defeatSkipVotes.length >= playerCount;

  useEffect(() => {
    setIntroDoneLocal(sessionStorage.getItem(introStorageKey(code)) === "1");
    setFinaleDoneLocal(sessionStorage.getItem(finaleStorageKey(code)) === "1");
    setDefeatDoneLocal(sessionStorage.getItem(defeatStorageKey(code)) === "1");
  }, [code, playerId]);

  useEffect(() => {
    if (gs.round !== 1 || gs.status !== "playing") return;
    sessionStorage.removeItem(introStorageKey(code));
    sessionStorage.removeItem(midStorageKey(code, playerId));
    sessionStorage.removeItem(lateStorageKey(code, playerId));
    setIntroDoneLocal(false);
  }, [code, playerId, gs.round, gs.status]);

  const completeIntro = useCallback(() => {
    sessionStorage.setItem(introStorageKey(code), "1");
    setIntroDoneLocal(true);
  }, [code]);

  const completeMid = useCallback(() => {
    getSocket().emit("game:mid-complete", { code, playerId }, () => {});
  }, [code, playerId]);

  const completeLate = useCallback(() => {
    getSocket().emit("game:late-complete", { code, playerId }, () => {});
  }, [code, playerId]);

  const returnToLobby = useCallback(() => {
    sessionStorage.removeItem(introStorageKey(code));
    sessionStorage.removeItem(midStorageKey(code, playerId));
    sessionStorage.removeItem(lateStorageKey(code, playerId));
    sessionStorage.removeItem(finaleStorageKey(code));
    sessionStorage.removeItem(defeatStorageKey(code));
    getSocket().emit("game:next-round", { code }, () => {});
  }, [code]);

  const completeVictoryFinale = useCallback(() => {
    sessionStorage.setItem(finaleStorageKey(code), "1");
    setFinaleDoneLocal(true);
    returnToLobby();
  }, [code, returnToLobby]);

  const completeDefeatFinale = useCallback(() => {
    sessionStorage.setItem(defeatStorageKey(code), "1");
    setDefeatDoneLocal(true);
    returnToLobby();
  }, [code, returnToLobby]);

  const introDone = introDoneLocal || serverIntroSkipped;
  const midDone = midInterludeDoneBy.includes(playerId);
  const allMidDone =
    playerCount > 0 &&
    room.players.every((p) => midInterludeDoneBy.includes(p.id));
  const lateDone = lateInterludeDoneBy.includes(playerId);
  const allLateDone =
    playerCount > 0 &&
    room.players.every((p) => lateInterludeDoneBy.includes(p.id));
  const finaleDone = finaleDoneLocal || serverFinaleSkipped;
  const defeatDone = defeatDoneLocal || serverDefeatSkipped;
  const showMidInterlude =
    gs.round === 4 && gs.status === "playing" && !midDone;
  const showLateInterlude =
    gs.round === 8 && gs.status === "playing" && !lateDone;
  const cutsceneActive =
    showMidInterlude ||
    showLateInterlude ||
    (gs.round === 4 && gs.status === "playing" && !allMidDone) ||
    (gs.round === 8 && gs.status === "playing" && !allLateDone);

  const isVictory =
    gs.status === "finished" &&
    gs.lastResult?.allCorrect === true &&
    gs.lives > 0 &&
    gs.round >= gs.settings.totalRounds;
  const isDefeat = gs.status === "finished" && gs.lives <= 0;
  const showVictoryFinale = isVictory && !finaleDone;
  const showDefeatFinale = isDefeat && !defeatDone;

  const mySubmitted = gs.answers[playerId]?.submitted ?? false;
  const opponentSubmitted = opponent
    ? (gs.answers[opponent.id]?.submitted ?? false)
    : false;

  mySubmittedRef.current = mySubmitted;

  const handleQuestionReady = useCallback(() => {
    setQuestionReady(true);
  }, []);

  useEffect(() => {
    setQuestionReady(false);
  }, [gs.round, gs.currentQuestion?.id]);

  useEffect(() => {
    if (gs.revealed || !gs.currentQuestion) {
      setQuestionReady(true);
    }
  }, [gs.revealed, gs.currentQuestion]);

  const onTimerExpire = useCallback(() => {
    if (mySubmittedRef.current || gs.revealed) return;
    getSocket().emit(
      "game:submit",
      {
        code,
        aboutSelf: aboutSelfRef.current.trim(),
        aboutFriend: aboutFriendRef.current.trim(),
      },
      () => {}
    );
  }, [code, gs.revealed]);

  const timerActive =
    introDone &&
    !cutsceneActive &&
    questionReady &&
    gs.status === "playing" &&
    !gs.revealed &&
    gs.settings.answerTimeSec > 0;

  const timeLeft = useCountdown(
    timerActive,
    gs.settings.answerTimeSec,
    onTimerExpire,
    gs.round
  );

  useEffect(() => {
    if (gs.status === "playing" && !gs.revealed) {
      setAboutSelf("");
      setAboutFriend("");
    }
  }, [gs.round, gs.status, gs.revealed]);

  const submit = () => {
    getSocket().emit(
      "game:submit",
      { code, aboutSelf: aboutSelf.trim(), aboutFriend: aboutFriend.trim() },
      () => {}
    );
  };

  const nextRound = () => {
    if (gs.status === "finished") {
      returnToLobby();
      return;
    }
    getSocket().emit("game:next-round", { code }, () => {});
  };

  if (!introDone && gs.round === 1 && gs.status === "playing") {
    return (
      <GameIntro
        code={code}
        playerId={playerId}
        playerCount={room.players.length}
        skipVotes={skipVotes}
        onComplete={completeIntro}
      />
    );
  }

  if (showMidInterlude) {
    return (
      <GameMidInterlude
        code={code}
        playerId={playerId}
        playerCount={room.players.length}
        skipVotes={midSkipVotes}
        onComplete={completeMid}
      />
    );
  }

  if (showLateInterlude) {
    return (
      <GameLateInterlude
        code={code}
        playerId={playerId}
        playerCount={room.players.length}
        skipVotes={lateSkipVotes}
        onComplete={completeLate}
      />
    );
  }

  if (showVictoryFinale) {
    return (
      <GameVictoryFinale
        code={code}
        playerId={playerId}
        playerCount={room.players.length}
        skipVotes={finaleSkipVotes}
        onComplete={completeVictoryFinale}
      />
    );
  }

  if (showDefeatFinale) {
    return (
      <GameDefeatFinale
        code={code}
        playerId={playerId}
        playerCount={room.players.length}
        skipVotes={defeatSkipVotes}
        onComplete={completeDefeatFinale}
      />
    );
  }

  const playerNames = room.players.map((p) => p.name);
  const nekoMessage =
    gs.lastResult?.playerMessages?.[playerId] ??
    gs.lastResult?.message ??
    "Игра окончена";

  const horrorRound = gs.round >= 8;

  if (gs.status === "finished") {
    return (
      <div className={`game-finished panel${horrorRound ? " game-arena-horror" : ""}`}>
        <PixelNekoHost round={gs.round} />
        <NekoLine
          text={nekoMessage}
          highlightNames={playerNames}
          className="game-neko-line glitch-text"
        />
        <LivesDisplay lives={Math.max(gs.lives, 0)} max={gs.settings.maxLives} />
        <button type="button" className="pixel-btn" onClick={nextRound}>
          Вернуться в комнату
        </button>
      </div>
    );
  }

  const myResult = gs.lastResult?.playerResults[playerId];
  const opponentResult = opponent ? gs.lastResult?.playerResults[opponent.id] : undefined;
  const showForms =
    gs.status === "playing" && !gs.revealed && !cutsceneActive;
  const showInterludeWait =
    (gs.round === 4 && gs.status === "playing" && midDone && !allMidDone) ||
    (gs.round === 8 && gs.status === "playing" && lateDone && !allLateDone);
  const showTimer =
    introDone &&
    !cutsceneActive &&
    questionReady &&
    gs.status === "playing" &&
    !gs.revealed &&
    gs.settings.answerTimeSec > 0;

  const questionTemplate = gs.currentQuestion?.text ?? "";
  const questionText = opponent
    ? formatQuestionForPlayer(questionTemplate, opponent.name)
    : questionTemplate;
  const highlightName = opponent?.name ?? "";

  return (
    <div className={`game-screen${horrorRound ? " game-arena-horror" : ""}`}>
      <header className="game-top-bar">
        <span className="game-round">
          Раунд {gs.round}/{gs.settings.totalRounds}
        </span>
        <LivesDisplay lives={gs.lives} max={gs.settings.maxLives} />
        {showTimer ? (
          <span
            className={`game-timer${timeLeft <= 10 ? " game-timer-urgent" : ""}`}
          >
            {timeLeft}с
          </span>
        ) : (
          <span className="game-timer game-timer-empty" aria-hidden />
        )}
      </header>

      {gs.currentQuestion && !gs.revealed && !cutsceneActive && (
        <QuestionReveal
          text={questionText}
          highlightName={highlightName}
          className="game-question"
          onComplete={handleQuestionReady}
        />
      )}

      {gs.revealed && gs.currentQuestion && (
        <QuestionStatic
          text={questionText}
          highlightName={highlightName}
          className="game-question game-question-static"
        />
      )}

      <div className="game-arena">
        {me && (
          <PlayerColumn
            name={me.name}
            avatarId={me.avatarId}
            cardText={gs.revealed ? myResult?.friendGuess : undefined}
            revealed={gs.revealed}
            submitted={mySubmitted}
            align="left"
          />
        )}

        <div className="game-neko-slot">
          <PixelNekoHost round={gs.round} />
        </div>

        {opponent && (
          <PlayerColumn
            name={opponent.name}
            avatarId={opponent.avatarId}
            cardText={gs.revealed ? opponentResult?.friendGuess : undefined}
            revealed={gs.revealed}
            submitted={opponentSubmitted}
            align="right"
          />
        )}
      </div>

      {showInterludeWait && (
        <p className="game-waiting">Ждём друга на перебивке…</p>
      )}

      {showForms && questionReady && !mySubmitted && (
        <div className="game-answer-form panel">
          <label className="game-form-label">
            Твой ответ (о себе)
            <input
              className="pixel-input"
              value={aboutSelf}
              onChange={(e) => setAboutSelf(e.target.value)}
            />
          </label>
          <label className="game-form-label">
            Как думаешь, ответит {opponent?.name}?
            <input
              className="pixel-input"
              value={aboutFriend}
              onChange={(e) => setAboutFriend(e.target.value)}
            />
          </label>
          <button type="button" className="pixel-btn" onClick={submit}>
            Готово
          </button>
        </div>
      )}

      {showForms && questionReady && mySubmitted && (
        <p className="game-waiting">Ждём ответа друга...</p>
      )}

      {gs.revealed && gs.lastResult && (
        <div className="game-result-block">
          <NekoLine
            text={
              gs.lastResult.playerMessages?.[playerId] ??
              gs.lastResult.message ??
              ""
            }
            highlightNames={playerNames}
          />
          {gs.status === "round-result" && (
            <button type="button" className="pixel-btn game-continue-btn" onClick={nextRound}>
              Продолжить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerColumn({
  name,
  avatarId,
  cardText,
  revealed,
  submitted,
  align = "left",
}: {
  name: string;
  avatarId: string;
  cardText?: string;
  revealed: boolean;
  submitted: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={`game-player game-player-${align}`}>
      <div className="avatar-frame avatar-frame-lg">
        <AvatarSprite id={avatarId} size="lg" glow />
      </div>
      <span className="game-player-name">{name}</span>
      <div
        className={`answer-card${revealed ? " answer-card-revealed" : ""}${submitted && !revealed ? " answer-card-submitted" : ""}${revealed && cardText ? " answer-card-glitch" : ""}`}
      >
        {revealed && cardText ? (
          <span className="answer-card-text">{cardText}</span>
        ) : submitted ? (
          <span className="answer-card-check" aria-label="Ответ отправлен">
            ✓
          </span>
        ) : (
          <span className="answer-card-mark">?</span>
        )}
      </div>
    </div>
  );
}
