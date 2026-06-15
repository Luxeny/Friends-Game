"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  enterRoomSocket,
  getSocket,
  leaveRoomSocket,
  loadPlayer,
  selectModeSocket,
  subscribeRoom,
  type StoredPlayer,
} from "@/lib/socket";
import { copyRoomLink, roomInviteUrl } from "@/lib/utils";
import { AvatarSprite } from "@/components/AvatarSprite";
import { MusicHorrorSync } from "@/components/MusicHorrorSync";
import { KnowEachOtherGame } from "@/components/KnowEachOtherGame";
import type { GameModeId, KnowEachOtherSettings, Room } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";

const GAME_MODES: {
  id: GameModeId;
  title: string;
  tag: string;
}[] = [
  {
    id: "know-each-other",
    title: "F2F - лицом к лицу",
    tag: "2 игрока · 10 раундов · 3 жизни",
  },
];

function F2FModeDescription() {
  return (
    <>
      Вы столкнетесь лицом к лицу. Не с врагом, а с тем, кого называете другом. Вам зададут 10
      вопросов. Каждый из них проверит, насколько глубоко вы знаете друг друга. Первая ошибка
      отнимет жизнь. Третья —{" "}
      <span className="mode-glitch-phrase">поставит крест на вашей дружбе</span>.
    </>
  );
}

function renderModeDescription(modeId: GameModeId) {
  if (modeId === "know-each-other") {
    return <F2FModeDescription />;
  }
  return null;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState(`/join/${code}`);

  useEffect(() => {
    setInviteLink(roomInviteUrl(code));
  }, [code]);
  const [settings, setSettings] = useState<KnowEachOtherSettings>(DEFAULT_SETTINGS);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [startFlash, setStartFlash] = useState(false);
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const prevPlayerCount = useRef(0);
  const playerCountInitialized = useRef(false);

  useEffect(() => {
    return subscribeRoom(setRoom);
  }, []);

  useEffect(() => {
    const stored = loadPlayer();
    setPlayer(stored);

    if (!code) return;

    if (!stored?.name.trim()) {
      router.replace(`/?join=${code}`);
      return;
    }

    setProfileReady(true);
  }, [code, router]);

  useEffect(() => {
    if (!profileReady || !player || !code) return;

    enterRoomSocket(code, player, setRoom);

    const socket = getSocket();
    const onReconnect = () => {
      enterRoomSocket(code, player, setRoom);
    };
    socket.on("connect", onReconnect);

    return () => {
      socket.off("connect", onReconnect);
    };
  }, [code, player, profileReady]);

  const handleExit = () => {
    void leaveRoomSocket(code, player!.id).then(() => {
      router.push("/");
    });
  };

  const playerCount = room?.players.length || 0;
  const isHost = Boolean(
    player && room?.players.find((p) => p.id === player.id)?.isHost
  );

  useEffect(() => {
    if (!profileReady || !isHost) return;

    if (!playerCountInitialized.current) {
      playerCountInitialized.current = true;
      prevPlayerCount.current = playerCount;
      return;
    }

    if (prevPlayerCount.current < 2 && playerCount >= 2) {
      setStartFlash(true);
    }
    prevPlayerCount.current = playerCount;
  }, [playerCount, isHost, profileReady]);

  const handleCopy = () => {
    copyRoomLink(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const adjustAnswerTime = (delta: number) => {
    setSettings((s) => ({
      ...s,
      answerTimeSec: Math.min(120, Math.max(10, s.answerTimeSec + delta)),
    }));
  };

  const startGame = () => {
    getSocket().emit(
      "game:start",
      {
        code,
        settings: {
          ...settings,
          answerTimeSec: timerEnabled ? settings.answerTimeSec : 0,
        },
      },
      () => {}
    );
  };

  if (!profileReady || !player) {
    return null;
  }

  const inGame = room?.gameState && room.gameState.status !== "lobby";
  const horrorMusic = Boolean(inGame && room?.gameState && room.gameState.round >= 8);
  const canStart = playerCount >= 2;
  const selectedMode = room?.lobby?.selectedMode ?? null;
  const selectedModeInfo = GAME_MODES.find((m) => m.id === selectedMode);

  const toggleMode = (modeId: GameModeId) => {
    if (!isHost || !player) return;
    selectModeSocket(code, modeId, player.id, setRoom);
  };

  return (
    <main className="layout-center" style={{ alignItems: "stretch" }}>
      <MusicHorrorSync horror={horrorMusic} />

      <div style={{ width: "min(1100px, 100%)", margin: "0 auto" }}>
        <header className="room-header">
          <button type="button" className="room-exit" onClick={handleExit}>
            ← выход
          </button>
          <h1 className="glitch-text room-header-title">Friends&apos; Game</h1>
          <span aria-hidden />
        </header>

        {inGame && room?.gameState ? (
          <KnowEachOtherGame room={room} playerId={player.id} code={code} />
        ) : (
          <div className="grid-room">
            <div className="room-sidebar">
              <aside className="panel room-block">
                <h2 className="room-block-title">Участники</h2>
                <ul className="room-participants">
                  {(room?.players || []).map((p) => (
                    <li key={p.id} className="room-participant">
                      <div className="avatar-frame" style={{ width: 68, height: 68 }}>
                        <AvatarSprite id={p.avatarId} size="sm" glow />
                      </div>
                      <div>
                        <div className="room-participant-name">{p.name}</div>
                        {p.isHost && (
                          <div className="room-participant-role">хост</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </aside>

              {isHost && (
                <aside className="panel room-block">
                  <h2 className="room-block-title">Пригласить друга</h2>
                  <p className="room-code-value glitch-text">{code}</p>
                  <p className="room-invite-link">{inviteLink}</p>
                  <button type="button" className="pixel-btn" onClick={handleCopy}>
                    {copied ? "Скопировано!" : "Скопировать ссылку"}
                  </button>
                </aside>
              )}
            </div>

            <section className="panel room-modes">
              <h2 className="room-block-title">Режимы</h2>

              <div className="mode-cards">
                {GAME_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-card${selectedMode === mode.id ? " mode-card-selected" : ""}${!isHost ? " mode-card-readonly" : ""}`}
                    onClick={() => toggleMode(mode.id)}
                    disabled={!isHost}
                  >
                    <span className="mode-card-title">{mode.title}</span>
                    <span className="mode-card-tag">{mode.tag}</span>
                  </button>
                ))}
              </div>

              {selectedModeInfo && (
                <div className="mode-details">
                  <p className="mode-details-text">
                    {renderModeDescription(selectedModeInfo.id)}
                  </p>

                  {isHost ? (
                    <div className="mode-settings">
                      <label className="mode-setting-row">
                        <input
                          type="checkbox"
                          className="mode-setting-toggle"
                          checked={timerEnabled}
                          onChange={(e) => setTimerEnabled(e.target.checked)}
                        />
                        <span>Таймер на ответ</span>
                      </label>

                      {timerEnabled && (
                        <div className="mode-time-control">
                          <span className="mode-time-label">Время на ответ (сек)</span>
                          <div className="mode-time-stepper">
                            <button
                              type="button"
                              className="pixel-btn mode-time-btn"
                              aria-label="Меньше времени"
                              onClick={() => adjustAnswerTime(-5)}
                              disabled={settings.answerTimeSec <= 10}
                            >
                              −
                            </button>
                            <span className="mode-time-value">{settings.answerTimeSec}</span>
                            <button
                              type="button"
                              className="pixel-btn mode-time-btn"
                              aria-label="Больше времени"
                              onClick={() => adjustAnswerTime(5)}
                              disabled={settings.answerTimeSec >= 120}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        className={`pixel-btn pixel-btn-start${canStart ? " pixel-btn-start-ready" : ""}${startFlash ? " pixel-btn-start-flash" : ""}`}
                        disabled={!canStart}
                        onAnimationEnd={() => setStartFlash(false)}
                        onClick={startGame}
                      >
                        Запуск
                      </button>

                      {!canStart && (
                        <p className="mode-waiting">Ждём второго игрока...</p>
                      )}
                    </div>
                  ) : (
                    <p className="mode-waiting">Хост выберет режим и запустит игру</p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
