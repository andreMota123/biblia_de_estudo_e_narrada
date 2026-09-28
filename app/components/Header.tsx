import type { ActiveTab, User } from "../types";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { AcademicCapIcon, BookOpenIcon, AppLogo, SearchIcon, SunIcon, MoonIcon, StarIcon, HighlighterIcon, NoteIcon } from "../lib/icons";

type HeaderProps = {
  user: User | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  savedStudiesCount: number;
  handleLogout: () => void;
  menuMobileAberto: boolean;
  setMenuMobileAberto: (v: boolean) => void;
  selectedBook: string;
  setSelectedBook: (b: string) => void;
  selectedChapter: number;
  setSelectedChapter: (c: number) => void;
  bookNames: string[];
  totalChapters: number;
  onSetSelectedVerse: (v: number) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
};

export default function Header({
  user,
  activeTab,
  setActiveTab,
  savedStudiesCount,
  handleLogout,
  menuMobileAberto,
  setMenuMobileAberto,
  selectedBook,
  setSelectedBook,
  selectedChapter,
  setSelectedChapter,
  bookNames,
  totalChapters,
  onSetSelectedVerse,
  theme,
  toggleTheme,
}: HeaderProps) {
  const changeBook = (book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    onSetSelectedVerse(1);
  };

  const changeChapter = (chapter: number) => {
    setSelectedChapter(chapter);
    onSetSelectedVerse(1);
  };

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)]/70 backdrop-blur-2xl px-4 md:px-6 py-3 shrink-0 z-20 supports-[backdrop-filter]:bg-[var(--bg)]/60">
      <div className="flex items-center justify-between">
        <div onClick={() => { setActiveTab("home"); setMenuMobileAberto(false); }} className="flex items-center gap-3 cursor-pointer">
          <AppLogo />
          <span className="text-base font-semibold tracking-[0.08em] uppercase text-[var(--text)]">
            Bíblia Origens
          </span>
        </div>

        {/* BOTÃO HAMBÚRGUER PARA CELULAR */}
        <div className="md:hidden flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border)]">
            <button
              onClick={() => theme !== "light" && toggleTheme()}
              className={`p-1.5 rounded-full transition-colors ${theme === "light" ? "bg-[var(--bg)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}
              aria-label="Tema claro"
            >
              <SunIcon />
            </button>
            <button
              onClick={() => theme !== "dark" && toggleTheme()}
              className={`p-1.5 rounded-full transition-colors ${theme === "dark" ? "bg-[var(--bg)] text-[var(--text)]" : "text-[var(--text-muted)]"}`}
              aria-label="Tema escuro"
            >
              <MoonIcon />
            </button>
          </div>
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm font-bold flex items-center gap-1.5"
            aria-label="Abrir Menu"
          >
            {menuMobileAberto ? "✕" : "☰"}
          </button>
        </div>

        {/* MENU DESKTOP (Sempre visível em telas médias/grandes) */}
        <div className="hidden md:flex items-center justify-between flex-1 ml-6">
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "home" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setActiveTab("read")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "read" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <BookOpenIcon /> Leitura
            </button>
            {user && (
              <button
                onClick={() => setActiveTab("studies")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "studies" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <AcademicCapIcon /> Meus Estudos ({savedStudiesCount})
              </button>
            )}
            {user && (
              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "favorites" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <StarIcon /> Favoritos
              </button>
            )}
            {user && (
              <button
                onClick={() => setActiveTab("highlights")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "highlights" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <HighlighterIcon /> Destacadas
              </button>
            )}
            {user && (
              <button
                onClick={() => setActiveTab("wordnotes")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "wordnotes" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <NoteIcon /> Notas
              </button>
            )}
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "search" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <SearchIcon /> Pesquisa
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* SELETOR DE TEMA ESTILO iOS (segmented control) */}
            <div className="flex items-center bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border)]">
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

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">Olá, <strong className="text-[var(--text)]">{user.name}</strong></span>
                {isSupabaseConfigured && <button onClick={handleLogout} className="text-xs font-semibold text-rose-400 hover:underline">Sair</button>}
              </div>
            ) : (
              <button onClick={() => setActiveTab("home")} className="text-xs bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg font-medium">
                Entrar / Criar Conta
              </button>
            )}

            {activeTab === "read" && (
              <div className="flex items-center gap-2 ml-2">
                <select
                  value={selectedBook}
                  onChange={(e) => changeBook(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none"
                >
                  {bookNames.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <select
                  value={selectedChapter}
                  onChange={(e) => changeChapter(Number(e.target.value))}
                  className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none"
                >
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTAINER DO MENU MOBILE (Abre quando pressionado no celular) */}
      {menuMobileAberto && (
        <div className="md:hidden mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-3">
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => { setActiveTab("home"); setMenuMobileAberto(false); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium text-left ${
                activeTab === "home" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
              }`}
            >
              Início
            </button>
            <button
              onClick={() => { setActiveTab("read"); setMenuMobileAberto(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                activeTab === "read" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
              }`}
            >
              <BookOpenIcon /> Leitura
            </button>
            {user && (
              <button
                onClick={() => { setActiveTab("studies"); setMenuMobileAberto(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                  activeTab === "studies" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
                }`}
              >
                <AcademicCapIcon /> Meus Estudos ({savedStudiesCount})
              </button>
            )}
            {user && (
              <button
                onClick={() => { setActiveTab("favorites"); setMenuMobileAberto(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                  activeTab === "favorites" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
                }`}
              >
                <StarIcon /> Favoritos
              </button>
            )}
            {user && (
              <button
                onClick={() => { setActiveTab("highlights"); setMenuMobileAberto(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                  activeTab === "highlights" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
                }`}
              >
                <HighlighterIcon /> Destacadas
              </button>
            )}
            {user && (
              <button
                onClick={() => { setActiveTab("wordnotes"); setMenuMobileAberto(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                  activeTab === "wordnotes" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
                }`}
              >
                <NoteIcon /> Notas
              </button>
            )}
            <button
              onClick={() => { setActiveTab("search"); setMenuMobileAberto(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                activeTab === "search" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] bg-[var(--bg-elevated)]"
              }`}
            >
              <SearchIcon /> Pesquisa
            </button>
          </nav>

          {/* SELETORES DE BÍBLIA NO MENU MOBILE */}
          {activeTab === "read" && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Livro e Capítulo:</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedBook}
                  onChange={(e) => changeBook(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium rounded-lg p-2 focus:outline-none"
                >
                  {bookNames.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <select
                  value={selectedChapter}
                  onChange={(e) => changeChapter(Number(e.target.value))}
                  className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium rounded-lg p-2 focus:outline-none"
                >
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>Capítulo {ch}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* USER LOGOUT MOBILE */}
          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            {user ? (
              <>
                <span className="text-xs text-[var(--text-muted)]">Olá, <strong className="text-[var(--text)]">{user.name}</strong></span>
                {isSupabaseConfigured && <button onClick={handleLogout} className="text-xs font-semibold text-rose-400">Sair</button>}
              </>
            ) : (
              <button onClick={() => { setActiveTab("home"); setMenuMobileAberto(false); }} className="w-full text-xs bg-[var(--accent)] text-white p-2 rounded-lg font-medium text-center">
                Entrar / Criar Conta
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
