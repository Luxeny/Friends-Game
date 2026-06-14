const MUSIC_SRC = "/music/pixeel-music.mp3";

type MusicState = {
  playing: boolean;
  horror: boolean;
  frozen: boolean;
};

let audio: HTMLAudioElement | null = null;
let state: MusicState = { playing: false, horror: false, frozen: false };
const listeners = new Set<() => void>();

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = "auto";
  }
  return audio;
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function subscribeBackgroundMusic(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getBackgroundMusicState(): MusicState {
  return state;
}

function syncPlayback() {
  const track = getAudio();
  if (!track) return;
  if (state.playing && !state.frozen) {
    void track.play().catch(() => {});
  } else {
    track.pause();
  }
}

export function toggleBackgroundMusic() {
  state = { ...state, playing: !state.playing };
  syncPlayback();
  notify();
}

export function setBackgroundMusicHorror(horror: boolean) {
  if (state.horror === horror) return;
  state = { ...state, horror };
  notify();
}

export function freezeBackgroundMusic() {
  if (state.frozen) return;
  state = { ...state, frozen: true };
  getAudio()?.pause();
}

export function resumeBackgroundMusic() {
  if (!state.frozen) return;
  state = { ...state, frozen: false };
  syncPlayback();
}

export function initBackgroundMusicEvents() {
  if (typeof window === "undefined") return () => {};

  const onMusic = (event: Event) => {
    const { action } = (event as CustomEvent<{ action: "freeze" | "resume" }>).detail;
    if (action === "freeze") {
      freezeBackgroundMusic();
    } else if (action === "resume") {
      resumeBackgroundMusic();
    }
  };

  window.addEventListener("fg-music", onMusic);
  return () => window.removeEventListener("fg-music", onMusic);
}
