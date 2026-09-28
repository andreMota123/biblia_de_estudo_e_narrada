"use client";

// Player da narração da Bíblia. Toca os MP3 gerados por
// scripts/gerar-narracao.py (voz neural, um arquivo por capítulo) e usa o
// JSON de tempos que acompanha cada capítulo para saber qual versículo está
// sendo narrado — é isso que permite destacar e rolar a tela junto com o
// áudio, pular de versículo em versículo e começar a ouvir de qualquer ponto.
//
// Por ser um <audio> de verdade (e não síntese de voz do navegador), o
// celular mostra os controles na tela bloqueada e continua tocando com a
// tela apagada.

import { useCallback, useEffect, useRef, useState } from "react";
import type { BibleData } from "../types";

export type AudioPosition = { book: string; chapter: number; verse: number };
export type AudioStatus = "idle" | "loading" | "playing" | "paused";

export type AudioSettings = {
  rate: number;
  continueNextChapter: boolean;
};

type VerseTiming = { v: number; s: number; e: number };
type ChapterTimings = { voz: string; duracao: number; versiculos: VerseTiming[] };

const SETTINGS_KEY = "biblia-origens-audio";
const POSITION_KEY = "biblia-origens-audio-posicao";

const DEFAULT_SETTINGS: AudioSettings = { rate: 1, continueNextChapter: true };

// Onde ficam os arquivos da narração. Por padrão, servidos pelo próprio app
// (public/narracao); em produção pode apontar para outro domínio/CDN.
const NARRACAO_BASE = (process.env.NEXT_PUBLIC_NARRACAO_URL || "/narracao").replace(/\/$/, "");
export const NARRACAO_VOZ = process.env.NEXT_PUBLIC_NARRACAO_VOZ || "pt-BR-AntonioNeural";

function chapterUrl(book: string, chapter: number, ext: "mp3" | "json") {
  return `${NARRACAO_BASE}/${NARRACAO_VOZ}/${encodeURIComponent(book)}/${chapter}.${ext}`;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Navegação privada ou armazenamento cheio: a preferência só não persiste.
  }
}

const timingsCache = new Map<string, ChapterTimings | null>();

async function loadTimings(book: string, chapter: number): Promise<ChapterTimings | null> {
  const key = `${book}-${chapter}`;
  if (timingsCache.has(key)) return timingsCache.get(key)!;
  try {
    const res = await fetch(chapterUrl(book, chapter, "json"));
    const data = res.ok ? ((await res.json()) as ChapterTimings) : null;
    timingsCache.set(key, data);
    return data;
  } catch {
    // Falha de rede não é cacheada: tenta de novo na próxima vez.
    return null;
  }
}

type UseBibleAudioOptions = {
  bibleData: BibleData;
  // Chamado quando a narração passa sozinha para o capítulo seguinte, para a
  // tela poder acompanhar (só se a pessoa ainda estiver no capítulo anterior).
  onChapterAdvance?: (from: AudioPosition, to: AudioPosition) => void;
};

export function useBibleAudio({ bibleData, onChapterAdvance }: UseBibleAudioOptions) {
  const [settings, setSettings] = useState<AudioSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readStorage<Partial<AudioSettings>>(SETTINGS_KEY, {}),
  }));
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [position, setPosition] = useState<AudioPosition | null>(() => readStorage<AudioPosition | null>(POSITION_KEY, null));
  const [error, setError] = useState<string | null>(null);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timingsRef = useRef<{ book: string; chapter: number; data: ChapterTimings } | null>(null);
  const positionRef = useRef(position);
  const statusRef = useRef(status);
  const settingsRef = useRef(settings);
  const bibleRef = useRef(bibleData);
  const onAdvanceRef = useRef(onChapterAdvance);
  const requestRef = useRef(0);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef({ onTimeUpdate: () => {}, onEnded: () => {} });

  useEffect(() => {
    bibleRef.current = bibleData;
    onAdvanceRef.current = onChapterAdvance;
  });

  const updatePosition = useCallback((pos: AudioPosition) => {
    const cur = positionRef.current;
    if (cur && cur.book === pos.book && cur.chapter === pos.chapter && cur.verse === pos.verse) return;
    positionRef.current = pos;
    setPosition(pos);
    writeStorage(POSITION_KEY, pos);
  }, []);

  const updateStatus = useCallback((s: AudioStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const chapterAfter = useCallback((book: string, chapter: number): AudioPosition | null => {
    const books = bibleRef.current.books;
    if (books[book] && chapter < books[book].chapters) return { book, chapter: chapter + 1, verse: 1 };
    const names = Object.keys(books);
    const i = names.indexOf(book);
    return i >= 0 && i < names.length - 1 ? { book: names[i + 1], chapter: 1, verse: 1 } : null;
  }, []);

  const updateMediaSession = useCallback((pos: AudioPosition) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${pos.book} ${pos.chapter}`,
      artist: "Bíblia Livre — narração",
      album: pos.book,
      artwork: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
  }, []);

  // Começa (ou retoma) a narração. Sem argumento, continua de onde parou.
  const play = useCallback(
    async (from?: AudioPosition) => {
      const audio = audioRef.current;
      const target = from ?? positionRef.current;
      if (!audio || !target) return;
      const requestId = ++requestRef.current;
      setError(null);

      const loaded = timingsRef.current;
      const sameChapter = loaded && loaded.book === target.book && loaded.chapter === target.chapter;

      // Retomar a pausa do mesmo capítulo: só dá play, sem pular.
      if (!from && sameChapter && audio.src) {
        updateStatus("playing");
        audio.play().catch(() => updateStatus("paused"));
        return;
      }

      updateStatus("loading");
      if (!sameChapter) audio.pause();
      const data = await loadTimings(target.book, target.chapter);
      if (requestId !== requestRef.current) return;
      if (!data) {
        updateStatus("idle");
        setError(`A narração de ${target.book} ${target.chapter} ainda não foi gerada.`);
        return;
      }

      if (!sameChapter) {
        timingsRef.current = { book: target.book, chapter: target.chapter, data };
        audio.src = chapterUrl(target.book, target.chapter, "mp3");
      }
      // O primeiro versículo começa do zero, para incluir o título falado
      // ("Salmos, capítulo 23").
      const first = data.versiculos[0];
      const timing = data.versiculos.find((t) => t.v === target.verse) ?? first;
      audio.currentTime = timing === first ? 0 : timing.s;
      audio.playbackRate = settingsRef.current.rate;
      updatePosition({ ...target, verse: timing.v });
      updateMediaSession(target);
      updateStatus("playing");
      try {
        await audio.play();
      } catch (err) {
        if (requestId !== requestRef.current) return;
        // play() interrompido por outro play() é normal; bloqueio de autoplay não.
        if (err instanceof DOMException && err.name === "AbortError") return;
        updateStatus("paused");
      }
    },
    [updateMediaSession, updatePosition, updateStatus]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    updateStatus("paused");
  }, [updateStatus]);

  const stop = useCallback(() => {
    requestRef.current += 1;
    audioRef.current?.pause();
    updateStatus("idle");
    setError(null);
  }, [updateStatus]);

  const toggle = useCallback(() => {
    if (statusRef.current === "playing" || statusRef.current === "loading") pause();
    else play();
  }, [pause, play]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const pos = positionRef.current;
      const loaded = timingsRef.current;
      if (!pos) return;
      let target: AudioPosition | null = null;
      if (loaded && loaded.book === pos.book && loaded.chapter === pos.chapter) {
        const verses = loaded.data.versiculos;
        const idx = verses.findIndex((t) => t.v === pos.verse);
        if (direction === 1) {
          target = idx >= 0 && idx < verses.length - 1 ? { ...pos, verse: verses[idx + 1].v } : chapterAfter(pos.book, pos.chapter);
        } else {
          // Como num player de música: se já passou uns segundos do começo do
          // versículo, volta pro começo dele; senão, vai pro anterior.
          const audio = audioRef.current;
          const intoVerse = audio && idx >= 0 ? audio.currentTime - verses[idx].s : 0;
          target = intoVerse > 2 || idx <= 0 ? pos : { ...pos, verse: verses[idx - 1].v };
        }
      } else {
        target = direction === 1 ? { ...pos, verse: pos.verse + 1 } : { ...pos, verse: Math.max(1, pos.verse - 1) };
      }
      if (!target) return;
      if (statusRef.current === "playing") play(target);
      else updatePosition(target);
    },
    [chapterAfter, play, updatePosition]
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const updateSettings = useCallback((patch: Partial<AudioSettings>) => {
    const merged = { ...settingsRef.current, ...patch };
    settingsRef.current = merged;
    setSettings(merged);
    writeStorage(SETTINGS_KEY, merged);
    // A velocidade muda na hora, sem alterar o tom da voz.
    if (audioRef.current) audioRef.current.playbackRate = merged.rate;
  }, []);

  const setSleepTimer = useCallback(
    (minutes: number | null) => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
      if (!minutes) {
        setSleepEndsAt(null);
        return;
      }
      const ms = minutes * 60_000;
      setSleepEndsAt(Date.now() + ms);
      sleepTimerRef.current = setTimeout(() => {
        sleepTimerRef.current = null;
        setSleepEndsAt(null);
        pause();
      }, ms);
    },
    [pause]
  );

  // Handlers dos eventos do <audio>, sempre com as funções mais recentes.
  useEffect(() => {
    handlersRef.current = {
      onTimeUpdate: () => {
        const audio = audioRef.current;
        const loaded = timingsRef.current;
        if (!audio || !loaded || statusRef.current === "loading") return;
        const t = audio.currentTime;
        const verses = loaded.data.versiculos;
        // Durante a pausa entre dois versículos, mantém o anterior destacado.
        let current = verses[0];
        for (const timing of verses) {
          if (timing.s <= t + 0.05) current = timing;
          else break;
        }
        updatePosition({ book: loaded.book, chapter: loaded.chapter, verse: current.v });
      },
      onEnded: () => {
        const loaded = timingsRef.current;
        if (!loaded) return;
        const from = { book: loaded.book, chapter: loaded.chapter, verse: loaded.data.versiculos.at(-1)?.v ?? 1 };
        const nextChapter = settingsRef.current.continueNextChapter ? chapterAfter(loaded.book, loaded.chapter) : null;
        if (!nextChapter) {
          updateStatus("idle");
          return;
        }
        onAdvanceRef.current?.(from, nextChapter);
        play(nextChapter);
      },
    };
  });

  // Cria o elemento de áudio uma única vez e liga os controles do sistema
  // (tela bloqueada, fone Bluetooth, central de mídia do computador).
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    const onTime = () => handlersRef.current.onTimeUpdate();
    const onEnd = () => handlersRef.current.onEnded();
    const onPauseEvt = () => {
      if (statusRef.current === "playing" && !audio.ended) updateStatus("paused");
    };
    const onPlayEvt = () => {
      if (statusRef.current !== "loading") updateStatus("playing");
    };
    const onError = () => {
      if (!audio.src) return;
      updateStatus("paused");
      setError("Não foi possível carregar o áudio. Verifique a conexão e toque em ▶.");
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPauseEvt);
    audio.addEventListener("play", onPlayEvt);
    audio.addEventListener("error", onError);

    const ms = typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
    ms?.setActionHandler("play", () => play());
    ms?.setActionHandler("pause", () => pause());
    ms?.setActionHandler("previoustrack", () => prev());
    ms?.setActionHandler("nexttrack", () => next());

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPauseEvt);
      audio.removeEventListener("play", onPlayEvt);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audioRef.current = null;
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
    // play/pause/next/prev são estáveis (useCallback sobre refs).
  }, [next, pause, play, prev, updateStatus]);

  return {
    status,
    position,
    error,
    settings,
    sleepEndsAt,
    play,
    pause,
    stop,
    toggle,
    next,
    prev,
    updateSettings,
    setSleepTimer,
  };
}

export type BibleAudio = ReturnType<typeof useBibleAudio>;
