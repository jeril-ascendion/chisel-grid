/**
 * T-08.4: Audio player component
 * HTML5 audio with custom UI: play/pause, seek, speed control, sticky bottom bar.
 */
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  src: string;
  title: string;
  /** When true, renders as sticky bottom bar */
  sticky?: boolean;
}

export function AudioPlayer({ src, title, sticky = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      setDuration(audio.duration);
      setLoading(false);
    };
    const onEnded = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  // Simple waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barCount = 60;
    const barWidth = w / barCount - 1;
    const progress = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < barCount; i++) {
      // Pseudo-random heights based on index (deterministic waveform)
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const barHeight = (Math.abs(seed % 1) * 0.6 + 0.2) * h;
      const x = i * (barWidth + 1);
      const y = (h - barHeight) / 2;
      const isPast = i / barCount <= progress;

      ctx.fillStyle = isPast
        ? 'var(--primary, #2563eb)'
        : 'var(--muted, #e2e8f0)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }
  }, [currentTime, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

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

  function seek(e: React.MouseEvent<HTMLCanvasElement>) {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length]!;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function skipForward() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 15, duration);
  }

  function skipBackward() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
  }

  function fmt(s: number): string {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const wrapperClass = sticky
    ? 'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-lg px-4 py-3'
    : 'rounded-lg border border-border bg-card p-4';

  return (
    <div className={wrapperClass}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={loading}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : playing ? (
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

        {/* Skip back */}
        <button
          onClick={skipBackward}
          aria-label="Skip back 15 seconds"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        {/* Waveform + time */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate font-medium text-foreground">{title}</span>
            <span className="shrink-0 ml-2 font-mono">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={32}
            onClick={seek}
            className="w-full h-8 cursor-pointer rounded"
            aria-label="Audio waveform — click to seek"
          />
        </div>

        {/* Skip forward */}
        <button
          onClick={skipForward}
          aria-label="Skip forward 15 seconds"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="shrink-0 px-2 py-1 text-xs font-mono font-medium rounded bg-muted hover:bg-muted transition-colors"
          aria-label={`Playback speed ${speed}x`}
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}
