import { useEffect, useState } from "react";
import type { BibleAudio } from "../lib/useBibleAudio";
import { MoonTimerIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, StopIcon } from "../lib/icons";

const RATES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
const SLEEP_OPTIONS = [15, 30, 45, 60];

type AudioPlayerProps = {
  audio: BibleAudio;
  onOpenPosition: () => void;
};

export default function AudioPlayer({ audio, onOpenPosition }: AudioPlayerProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { status, position, error, settings, sleepEndsAt } = audio;

  // Relógio só para mostrar os minutos restantes do timer de dormir.
  useEffect(() => {
    if (!sleepEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [sleepEndsAt]);

  if (!position) return null;
  const sleepMinutesLeft = sleepEndsAt ? Math.max(1, Math.ceil((sleepEndsAt - now) / 60_000)) : null;
  const isPlaying = status === "playing" || status === "loading";

  return (
    <div className="shrink-0 z-30 border-t border-[var(--border)] bg-[var(--bg-panel)]/90 backdrop-blur-2xl px-3 md:px-6 py-2.5">
      {showOptions && (
        <div className="max-w-3xl mx-auto mb-3 pb-3 border-b border-[var(--border)] space-y-3 text-xs">
          <div>
            <p className="font-bold text-[var(--text-muted)] uppercase tracking-wide text-[10px] mb-1.5">Velocidade</p>
            <div className="flex flex-wrap gap-1.5">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => audio.updateSettings({ rate: r })}
                  className={`px-2.5 py-1 rounded-lg border ${
                    settings.rate === r
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  {r.toString().replace(".", ",")}x
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-[var(--text-muted)] uppercase tracking-wide text-[10px] mb-1.5">Parar depois de</p>
            <div className="flex flex-wrap gap-1.5">
              {SLEEP_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => audio.setSleepTimer(m)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                >
                  {m} min
                </button>
              ))}
              {sleepEndsAt && (
                <button
                  onClick={() => audio.setSleepTimer(null)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--danger)]"
                >
                  Cancelar timer
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={settings.continueNextChapter}
              onChange={(e) => audio.updateSettings({ continueNextChapter: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Continuar automaticamente no próximo capítulo
          </label>
        </div>
      )}

      <div className="max-w-3xl mx-auto flex items-center gap-2 md:gap-3">
        <button onClick={onOpenPosition} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-serif font-bold text-[var(--text)] truncate">
            {position.book} {position.chapter}:{position.verse}
          </p>
          <p className={`text-[10px] truncate ${error ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
            {error ??
              (status === "loading"
                ? "Carregando narração..."
                : status === "playing"
                  ? `Narrando${sleepMinutesLeft ? ` · para em ${sleepMinutesLeft} min` : ""}`
                  : status === "paused"
                    ? "Pausado"
                    : "Continuar de onde parou")}
          </p>
        </button>

        <button onClick={audio.prev} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]" aria-label="Versículo anterior">
          <PrevIcon />
        </button>
        <button
          onClick={audio.toggle}
          className="w-11 h-11 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:bg-[var(--accent-hover)]"
          aria-label={isPlaying ? "Pausar" : "Ouvir"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={audio.next} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]" aria-label="Próximo versículo">
          <NextIcon />
        </button>

        <button
          onClick={() => setShowOptions((v) => !v)}
          className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
            showOptions ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          {settings.rate.toString().replace(".", ",")}x
          {sleepEndsAt && <MoonTimerIcon />}
        </button>
        <button
          onClick={() => setShowOptions((v) => !v)}
          className={`sm:hidden p-2 rounded-full ${showOptions ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
          aria-label="Opções da narração"
        >
          <MoonTimerIcon />
        </button>
        <button onClick={audio.stop} className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]" aria-label="Fechar player">
          <StopIcon />
        </button>
      </div>
    </div>
  );
}
