"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createPlayerId,
  getSocket,
  loadPlayer,
  savePlayer,
} from "@/lib/socket";
import { DEFAULT_AVATAR_ID, normalizeAvatarId } from "@/lib/utils";
import { AvatarPicker } from "@/components/AvatarSprite";
import type { Room } from "@/shared/types";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = (searchParams.get("join") || "").toUpperCase().slice(0, 8);
  const isInviteMode = inviteCode.length === 8;

  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [joinCode, setJoinCode] = useState("");
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = loadPlayer();
    if (stored) {
      setName(stored.name);
      setAvatarId(normalizeAvatarId(stored.avatarId));
    }
  }, []);

  useEffect(() => {
    if (isInviteMode) {
      setJoinCode(inviteCode);
    }
  }, [inviteCode, isInviteMode]);

  function persistPlayer() {
    const id = loadPlayer()?.id || createPlayerId();
    savePlayer({ id, name: name.trim(), avatarId });
    return id;
  }

  function requireName(): boolean {
    if (name.trim()) {
      setNameError("");
      return true;
    }
    setNameError("Введите имя");
    return false;
  }

  function createRoom() {
    if (!requireName()) return;

    setLoading(true);
    setError("");
    const playerId = persistPlayer();
    const socket = getSocket();

    socket.emit(
      "room:create",
      { playerId, name: name.trim(), avatarId },
      (res: { ok: boolean; room?: Room; error?: string }) => {
        setLoading(false);
        if (!res.ok || !res.room) {
          setError(res.error || "Не удалось создать комнату");
          return;
        }
        router.push(`/room/${res.room.code}`);
      }
    );
  }

  function joinRoom(codeOverride?: string) {
    if (!requireName()) return;

    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (code.length !== 8) {
      setError("Код комнаты — 8 символов");
      return;
    }

    setLoading(true);
    setError("");
    const playerId = persistPlayer();
    const socket = getSocket();

    socket.emit(
      "room:join",
      {
        code,
        playerId,
        name: name.trim(),
        avatarId,
      },
      (res: { ok: boolean; room?: Room; error?: string }) => {
        setLoading(false);
        if (!res.ok || !res.room) {
          setError(res.error || "Не удалось войти");
          return;
        }
        router.push(`/room/${res.room.code}`);
      }
    );
  }

  return (
    <main className="layout-center home-layout">
      <h1 className="home-title glitch-text">Friends&apos; Game</h1>

      <div className="panel home-panel">
        <div className="profile-row">
          <AvatarPicker avatarId={avatarId} onAvatarChange={setAvatarId} />

          <div className="profile-name">
            <label>
              <span className="field-label">никнейм</span>
              <input
                className={`pixel-input pixel-input-lg${nameError ? " pixel-input-error" : ""}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError && e.target.value.trim()) {
                    setNameError("");
                  }
                }}
                placeholder="введите имя"
                maxLength={16}
              />
              {nameError && <p className="field-error">{nameError}</p>}
            </label>
          </div>
        </div>

        {isInviteMode ? (
          <button
            type="button"
            className="pixel-btn pixel-btn-lg"
            style={{ width: "100%" }}
            disabled={loading}
            onClick={() => joinRoom(inviteCode)}
          >
            Войти
          </button>
        ) : (
          <>
            <button
              type="button"
              className="pixel-btn pixel-btn-lg"
              style={{ width: "100%" }}
              disabled={loading}
              onClick={createRoom}
            >
              Создать комнату
            </button>

            <div className="home-divider-block">
              <p className="home-divider">— или войти по коду —</p>
              <input
                className="pixel-input pixel-input-lg"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
              />
              <button
                type="button"
                className="pixel-btn pixel-btn-lg"
                disabled={loading}
                onClick={() => joinRoom()}
              >
                Войти в комнату
              </button>
            </div>
          </>
        )}

        {error && <p className="home-error">{error}</p>}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
