'use client';

import { useRef, useState, useEffect } from 'react';

export function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length]!;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function fmt(s: number): string {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground">{title}</span>
          <span className="shrink-0 ml-2">{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          className="w-full h-1 accent-primary cursor-pointer"
          aria-label="Seek"
        />
      </div>

      <button
        onClick={cycleSpeed}
        className="shrink-0 px-2 py-1 text-xs font-mono font-medium rounded bg-muted hover:bg-muted hover:text-foreground transition-colors"
        aria-label={`Playback speed ${speed}x`}
      >
        {speed}x
      </button>
    </div>
  );
}
