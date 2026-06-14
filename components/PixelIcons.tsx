export function MusicIcon({ active = true }: { active?: boolean }) {
  return (
    <span
      aria-hidden
      className={active ? "music-icon music-icon-on" : "music-icon music-icon-off"}
    />
  );
}
