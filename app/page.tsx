"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import bibleData from "../data/bible/bible.json";
import contextData from "../data/study/context.json";
import type {
  ActiveSidePanel,
  ActiveTab,
  BibleData,
  ContextInfo,
  HighlightColor,
  InterlinearWord,
  ReferenceItem,
  SearchResult,
  User,
  UserData,
} from "./types";
import AuthNotice from "./components/AuthNotice";
import { SunIcon, MoonIcon } from "./lib/icons";
import Header from "./components/Header";
import HomeView from "./components/HomeView";
import ReadView from "./components/ReadView";
import StudiesView from "./components/StudiesView";
import FavoritesView from "./components/FavoritesView";
import HighlightsView from "./components/HighlightsView";
import WordNotesView from "./components/WordNotesView";
import SearchView from "./components/SearchView";
import { loadBookLexicon } from "./lib/lexicon";
import { loadCrossReferences, getCrossReferences } from "./lib/crossReferences";
import { loadOccurrences } from "./lib/occurrences";
import { resolveWordSearch } from "./lib/wordSearch";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import {
  fetchUserData,
  upsertVerseNote,
  fetchWordNotes,
  upsertWordNote,
  LOCAL_USER,
  loadLocalUserData,
  loadLocalWordNotes,
} from "./lib/userDataStore";
import { useBibleAudio, type AudioPosition } from "./lib/useBibleAudio";
import AudioPlayer from "./components/AudioPlayer";
import { loadReadingSettings, saveReadingSettings, type ReadingSettings } from "./lib/readingFonts";

const LAST_READ_KEY = "biblia-origens-ultima-leitura";

type LastRead = { book: string; chapter: number; verse: number };

function readLastRead(): LastRead | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_READ_KEY) || "null") as LastRead | null;
    return parsed?.book && parsed.chapter ? parsed : null;
  } catch {
    return null;
  }
}

const subscribeNothing = () => () => {};

export default function BibliaOrigensApp() {
  const typedBibleData = bibleData as unknown as BibleData;
  const typedContextData = contextData as unknown as Record<string, ContextInfo>;

  // ESTADOS
  // Em modo local (sem Supabase) já começa "logado" como o leitor local.
  const [user, setUser] = useState<User | null>(isSupabaseConfigured ? null : LOCAL_USER);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // TEMA CLARO/ESCURO — persistido no navegador, aplicado via atributo no <html>
  // (as variáveis de cor em globals.css reagem a esse atributo). O valor
  // inicial já lê o localStorage na primeira renderização (fora de um efeito).
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("biblia-origens-theme");
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("biblia-origens-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Tamanho e fonte da letra da leitura (botão "Aa"), guardados no navegador.
  const [reading, setReading] = useState<ReadingSettings>(loadReadingSettings);
  useEffect(() => saveReadingSettings(reading), [reading]);

  // Reabre no último capítulo lido.
  const [selectedBook, setSelectedBook] = useState<string>(() => {
    const last = readLastRead();
    return last && typedBibleData.books[last.book] ? last.book : "Gênesis";
  });
  const [selectedChapter, setSelectedChapter] = useState<number>(() => readLastRead()?.chapter ?? 1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(() => readLastRead()?.verse ?? 1);

  useEffect(() => {
    try {
      localStorage.setItem(
        LAST_READ_KEY,
        JSON.stringify({ book: selectedBook, chapter: selectedChapter, verse: selectedVerse ?? 1 })
      );
    } catch {
      // sem armazenamento: só não lembra a posição
    }
  }, [selectedBook, selectedChapter, selectedVerse]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [activeSidePanel, setActiveSidePanel] = useState<ActiveSidePanel>("none");
  const [selectedWord, setSelectedWord] = useState<InterlinearWord | null>(null);

  const [userData, setUserData] = useState<UserData>(() => (isSupabaseConfigured ? {} : loadLocalUserData()));
  const [wordNotes, setWordNotes] = useState<Record<string, string>>(() =>
    isSupabaseConfigured ? {} : loadLocalWordNotes()
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchTermRef = useRef("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // ESTADO DO MENU MOBILE
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // Força um novo render de ReadView quando o léxico interlinear do livro
  // selecionado termina de carregar (getInterlinearWords lê de um cache que
  // não é estado do React, então repassamos o contador como prop para
  // ReadView, que o usa apenas para invalidar seu cálculo memoizado).
  const [lexiconTick, setLexiconTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadBookLexicon(selectedBook), loadCrossReferences(selectedBook)]).then(() => {
      if (!cancelled) setLexiconTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBook]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    // Restaura a sessão (o supabase-js já persiste o token no localStorage
    // internamente) e escuta login/logout feitos em outras abas.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session?.user) return;
      const su = session.user;
      setUser({ id: su.id, email: su.email ?? "", name: (su.user_metadata?.name as string) || process.env.NEXT_PUBLIC_READER_NAME || (su.email?.split("@")[0] ?? "") });
      setActiveTab("read");
      const [data, wNotes] = await Promise.all([fetchUserData(su.id), fetchWordNotes(su.id)]);
      if (!cancelled) {
        setUserData(data);
        setWordNotes(wNotes);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        setUserData({});
        setWordNotes({});
        return;
      }
      const su = session.user;
      setUser({ id: su.id, email: su.email ?? "", name: (su.user_metadata?.name as string) || process.env.NEXT_PUBLIC_READER_NAME || (su.email?.split("@")[0] ?? "") });
      const [data, wNotes] = await Promise.all([fetchUserData(su.id), fetchWordNotes(su.id)]);
      setUserData(data);
      setWordNotes(wNotes);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const triggerAuthAlert = (message: string) => {
    setAuthNotice(message);
    setTimeout(() => setAuthNotice(null), 5000);
  };

  // Atualiza o estado local de imediato (UI otimista) e grava só a nota do
  // versículo alterado no Supabase, em vez de reescrever tudo.
  const saveUserData = (newData: UserData, changedKey?: string) => {
    setUserData(newData);
    if (user && changedKey) {
      upsertVerseNote(user.id, changedKey, newData[changedKey]);
    }
  };

  const saveWordNote = (strong: string, note: string) => {
    if (!user) {
      triggerAuthAlert("Apenas pessoas logadas podem criar anotações de palavra.");
      return;
    }
    setWordNotes((prev) => ({ ...prev, [strong]: note }));
    upsertWordNote(user.id, strong, note);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;

    if (authMode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
        options: { data: { name: nameInput || emailInput.split("@")[0] } },
      });
      if (error) {
        triggerAuthAlert(error.message);
        return;
      }
      if (!data.session) {
        // Projeto com confirmação de e-mail ativada: ainda não há sessão.
        triggerAuthAlert("Conta criada! Verifique seu e-mail para confirmar o acesso.");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });
      if (error) {
        triggerAuthAlert(error.message);
        return;
      }
    }

    setAuthNotice(null);
    setActiveTab("read");
  };

  // NARRAÇÃO — o player vive aqui (e não no ReadView) para continuar tocando
  // ao trocar de capítulo ou de aba.
  const selectedRef = useRef({ book: selectedBook, chapter: selectedChapter });
  useEffect(() => {
    selectedRef.current = { book: selectedBook, chapter: selectedChapter };
  }, [selectedBook, selectedChapter]);

  const audio = useBibleAudio({
    bibleData: typedBibleData,
    // Quando a narração passa pro capítulo seguinte, a tela acompanha — mas
    // só se a pessoa estava vendo o capítulo que acabou de ser narrado.
    onChapterAdvance: (from: AudioPosition, to: AudioPosition) => {
      const cur = selectedRef.current;
      if (cur.book === from.book && cur.chapter === from.chapter) {
        setSelectedBook(to.book);
        setSelectedChapter(to.chapter);
        setSelectedVerse(to.verse);
      }
    },
  });

  const listenFrom = (verse: number) => {
    audio.play({ book: selectedBook, chapter: selectedChapter, verse });
  };

  const audioVerse =
    audio.status !== "idle" && audio.position?.book === selectedBook && audio.position.chapter === selectedChapter
      ? audio.position.verse
      : null;

  // A página é pré-renderizada no servidor, mas quase todo o estado inicial
  // vem do localStorage (tema, última leitura, modo local). Até hidratar,
  // mostra só o fundo — assim servidor e navegador renderizam o mesmo HTML.
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserData({});
    setActiveTab("home");
  };

  const currentBook = typedBibleData.books[selectedBook];
  const totalChapters = currentBook ? currentBook.chapters : 1;
  const currentChapterVerses = currentBook?.chapterData[selectedChapter.toString()] || {};
  const currentLanguage = currentBook?.testament === "Novo Testamento" ? "Grego" : "Hebraico";

  const currentVerseKey = selectedVerse ? `${selectedBook}-${selectedChapter}-${selectedVerse}` : null;
  const currentVerseNote = currentVerseKey ? userData[currentVerseKey] || { favorite: false, highlightColor: null, note: "", study: "" } : null;

  const toggleFavorite = (verseNum: number) => {
    if (!user) {
      triggerAuthAlert("Apenas pessoas logadas podem favoritar versículos.");
      return;
    }
    const key = `${selectedBook}-${selectedChapter}-${verseNum}`;
    const existing = userData[key] || { favorite: false, highlightColor: null, note: "", study: "" };
    saveUserData({ ...userData, [key]: { ...existing, favorite: !existing.favorite } }, key);
  };

  // Clicar na mesma cor que já está aplicada remove o destaque; clicar em
  // outra cor troca o destaque para ela.
  const setHighlight = (verseNum: number, color: HighlightColor) => {
    if (!user) {
      triggerAuthAlert("Apenas pessoas logadas podem destacar versículos.");
      return;
    }
    const key = `${selectedBook}-${selectedChapter}-${verseNum}`;
    const existing = userData[key] || { favorite: false, highlightColor: null, note: "", study: "" };
    const next = existing.highlightColor === color ? null : color;
    saveUserData({ ...userData, [key]: { ...existing, highlightColor: next } }, key);
  };

  const saveStudyText = (studyText: string) => {
    if (!user) {
      triggerAuthAlert("Apenas pessoas logadas podem criar anotações de estudo.");
      return;
    }
    if (!currentVerseKey) return;
    const existing = userData[currentVerseKey] || { favorite: false, highlightColor: null, note: "", study: "" };
    saveUserData({ ...userData, [currentVerseKey]: { ...existing, study: studyText } }, currentVerseKey);
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    searchTermRef.current = term;
    if (!term.trim() || term.length < 3) {
      setSearchResults([]);
      return;
    }

    // Primeiro tenta reconhecer a busca como um Strong's ou a transliteração
    // de uma palavra original (ex: "H2617", "chesed").
    const strongs = await resolveWordSearch(term);
    if (searchTermRef.current !== term) return; // usuário já digitou outra coisa

    if (strongs && strongs.length > 0) {
      const occurrenceLists = await Promise.all(strongs.map((s) => loadOccurrences(s)));
      if (searchTermRef.current !== term) return;

      const results: SearchResult[] = [];
      for (const list of occurrenceLists) {
        if (!list) continue;
        for (const o of list) {
          if (results.length >= 100) break;
          const text = typedBibleData.books[o.b]?.chapterData[String(o.c)]?.[String(o.v)] || "";
          results.push({
            bookKey: o.b,
            bookName: `${o.b} — ${o.o} (${o.t})`,
            chapter: String(o.c),
            verse: String(o.v),
            text,
          });
        }
      }
      setSearchResults(results);
      return;
    }

    // Busca normal: substring no texto em português.
    const results: SearchResult[] = [];
    const termLower = term.toLowerCase();

    Object.entries(typedBibleData.books).forEach(([bKey, book]) => {
      Object.entries(book.chapterData).forEach(([cNum, chapter]) => {
        Object.entries(chapter).forEach(([vNum, verseText]) => {
          if (verseText.toLowerCase().includes(termLower) && results.length < 100) {
            results.push({ bookKey: bKey, bookName: book.name, chapter: cNum, verse: vNum, text: verseText });
          }
        });
      });
    });
    setSearchResults(results);
  };

  const savedStudiesList = useMemo(() => {
    return Object.entries(userData)
      .filter(([, v]) => v.study && v.study.trim() !== "")
      .map(([key, value]) => {
        const [book, chapter, verse] = key.split("-");
        return {
          key, book, chapter: parseInt(chapter), verse: parseInt(verse),
          study: value.study,
          verseText: typedBibleData.books[book]?.chapterData[chapter]?.[verse] || "",
        };
      });
  }, [userData, typedBibleData]);

  const navigateToVerse = (book: string, chapter: number, verse: number, openStudy = false) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerse(verse);
    setActiveTab("read");
    setMenuMobileAberto(false);
    if (openStudy) setActiveSidePanel("study");
  };

  // Só existem referências cruzadas reais para versículos cadastrados na
  // Treasury of Scripture Knowledge (24.900 dos 31.102 versículos da Bíblia).
  // Para o resto, o painel mostra que não há referência cadastrada — nunca
  // um conjunto genérico fixo se passando por dado real. O texto de cada
  // referência é resolvido ao vivo a partir do próprio bibleData (nunca
  // duplicado em outro arquivo, sempre em sincronia com o texto do app).
  const currentReferences = useMemo(() => {
    const verseNum = selectedVerse || 1;
    const targets = getCrossReferences(selectedBook, `${selectedChapter}-${verseNum}`);
    if (!targets) return [];

    return targets
      .map((t) => {
        const text = typedBibleData.books[t.b]?.chapterData[String(t.c)]?.[String(t.v)];
        if (!text) return null;
        return { passage: `${t.b} ${t.c}:${t.v}`, text };
      })
      .filter((r): r is ReferenceItem => r !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lexiconTick força o recálculo depois que loadCrossReferences preenche um cache fora do estado do React (mesmo padrão usado para o léxico).
  }, [selectedBook, selectedChapter, selectedVerse, lexiconTick, typedBibleData]);

  if (!hydrated) {
    return <div className="h-dvh w-screen bg-[var(--bg)]" />;
  }

  return (
    <div className="h-dvh w-screen bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">

      {authNotice && (
        <AuthNotice message={authNotice} onGoToLogin={() => setActiveTab("home")} />
      )}

      {!user && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-30 flex items-center bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border)]">
          <button
            onClick={() => theme !== "light" && toggleTheme()}
            className={`p-1.5 rounded-full transition-colors ${theme === "light" ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]"}`}
            aria-label="Tema claro"
            title="Tema claro"
          >
            <SunIcon />
          </button>
          <button
            onClick={() => theme !== "dark" && toggleTheme()}
            className={`p-1.5 rounded-full transition-colors ${theme === "dark" ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]"}`}
            aria-label="Tema escuro"
            title="Tema escuro"
          >
            <MoonIcon />
          </button>
        </div>
      )}

      {user && (
        <Header
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          savedStudiesCount={savedStudiesList.length}
          handleLogout={handleLogout}
          menuMobileAberto={menuMobileAberto}
          setMenuMobileAberto={setMenuMobileAberto}
          selectedBook={selectedBook}
          setSelectedBook={setSelectedBook}
          selectedChapter={selectedChapter}
          setSelectedChapter={setSelectedChapter}
          bookNames={Object.keys(typedBibleData.books)}
          totalChapters={totalChapters}
          onSetSelectedVerse={setSelectedVerse}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {(!user || activeTab === "home") && (
          <HomeView
            user={user}
            authMode={authMode}
            setAuthMode={setAuthMode}
            emailInput={emailInput}
            setEmailInput={setEmailInput}
            nameInput={nameInput}
            setNameInput={setNameInput}
            passwordInput={passwordInput}
            setPasswordInput={setPasswordInput}
            handleAuth={handleAuth}
            onStartReading={() => setActiveTab("read")}
            setActiveTab={setActiveTab}
            lastReading={{ book: selectedBook, chapter: selectedChapter }}
            onListen={() => {
              setActiveTab("read");
              audio.play(audio.position ?? { book: selectedBook, chapter: selectedChapter, verse: 1 });
            }}
            listenLabel={audio.position ? `${audio.position.book} ${audio.position.chapter}:${audio.position.verse}` : null}
          />
        )}

        {activeTab === "read" && user && (
          <ReadView
            key={`${selectedBook}-${selectedChapter}`}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            selectedVerse={selectedVerse}
            setSelectedVerse={setSelectedVerse}
            currentLanguage={currentLanguage}
            currentChapterVerses={currentChapterVerses}
            userData={userData}
            activeSidePanel={activeSidePanel}
            setActiveSidePanel={setActiveSidePanel}
            toggleFavorite={toggleFavorite}
            setHighlight={setHighlight}
            setSelectedWord={setSelectedWord}
            selectedWord={selectedWord}
            typedContextData={typedContextData}
            currentVerseKey={currentVerseKey}
            currentVerseNote={currentVerseNote}
            saveStudyText={saveStudyText}
            currentReferences={currentReferences}
            lexiconVersion={lexiconTick}
            navigateToVerse={navigateToVerse}
            bibleData={typedBibleData}
            wordNotes={wordNotes}
            saveWordNote={saveWordNote}
            audioVerse={audioVerse}
            onListenFrom={listenFrom}
            reading={reading}
            onReadingChange={setReading}
          />
        )}

        {activeTab === "studies" && user && (
          <StudiesView savedStudiesList={savedStudiesList} navigateToVerse={navigateToVerse} />
        )}

        {activeTab === "favorites" && user && (
          <FavoritesView userData={userData} bibleData={typedBibleData} navigateToVerse={navigateToVerse} />
        )}

        {activeTab === "highlights" && user && (
          <HighlightsView userData={userData} bibleData={typedBibleData} navigateToVerse={navigateToVerse} />
        )}

        {activeTab === "wordnotes" && user && (
          <WordNotesView wordNotes={wordNotes} navigateToVerse={navigateToVerse} />
        )}

        {activeTab === "search" && user && (
          <SearchView
            searchTerm={searchTerm}
            handleSearch={handleSearch}
            searchResults={searchResults}
            navigateToVerse={navigateToVerse}
          />
        )}
      </div>

      {user && audio.status !== "idle" && (
        <AudioPlayer
          audio={audio}
          onOpenPosition={() => {
            if (audio.position) navigateToVerse(audio.position.book, audio.position.chapter, audio.position.verse);
          }}
        />
      )}
    </div>
  );
}
