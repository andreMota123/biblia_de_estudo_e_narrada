import { useState } from "react";
import { AnimatedLogo, EyeIcon, HeadphonesIcon, BookOpenIcon, AcademicCapIcon, StarIcon, HighlighterIcon, NoteIcon, SearchIcon, LibraryIcon } from "../lib/icons";
import type { ActiveTab } from "../types";

type HomeViewProps = {
  user: { id: string; name: string; email: string } | null;
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  nameInput: string;
  setNameInput: (v: string) => void;
  passwordInput: string;
  setPasswordInput: (v: string) => void;
  handleAuth: (e: React.FormEvent) => void;
  onStartReading: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  lastReading: { book: string; chapter: number };
  onListen: () => void;
  // "João 3:16" quando há uma narração em andamento/pausada para retomar.
  listenLabel: string | null;
};

const HUB_ITEMS: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { tab: "read", label: "Leitura", icon: <BookOpenIcon /> },
  { tab: "studies", label: "Meus Estudos", icon: <AcademicCapIcon /> },
  { tab: "favorites", label: "Favoritos", icon: <StarIcon /> },
  { tab: "highlights", label: "Passagens Destacadas", icon: <HighlighterIcon /> },
  { tab: "wordnotes", label: "Minhas Notas", icon: <NoteIcon /> },
  { tab: "library", label: "Biblioteca", icon: <LibraryIcon /> },
  { tab: "search", label: "Pesquisa", icon: <SearchIcon /> },
];

export default function HomeView({
  user,
  authMode,
  setAuthMode,
  emailInput,
  setEmailInput,
  nameInput,
  setNameInput,
  passwordInput,
  setPasswordInput,
  handleAuth,
  setActiveTab,
  lastReading,
  onListen,
  listenLabel,
}: HomeViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="flex-1 flex items-center justify-center relative overflow-y-auto bg-[var(--bg)] py-8">
      {/* GLOW DECORATIVO DE FUNDO */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm px-4 flex flex-col items-center">
        <AnimatedLogo />

        <h1 className="mt-5 text-lg font-semibold tracking-[0.15em] uppercase text-[var(--text)] opacity-0 animate-[fadeIn_0.6s_ease_1.4s_forwards]">
          Bíblia Origens
        </h1>

        {user && (
          <div className="mt-8 w-full opacity-0 animate-[fadeIn_0.6s_ease_1.8s_forwards]">
            <p className="text-center text-xs text-[var(--text-muted)] mb-6">
              Olá, <strong className="text-[var(--text)]">{user.name}</strong> — o que você quer fazer?
            </p>
            {/* CONTINUAR DE ONDE PAROU */}
            <div className="mb-4 p-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-elevated)]/70">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Continuar de onde parou</p>
              <p className="mt-1 text-lg font-serif font-bold text-[var(--text)]">
                {lastReading.book} {lastReading.chapter}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab("read")}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/60"
                >
                  <BookOpenIcon /> Ler
                </button>
                <button
                  onClick={onListen}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                >
                  <HeadphonesIcon /> Ouvir
                </button>
              </div>
              {listenLabel && (
                <p className="mt-2 text-[10px] text-center text-[var(--text-dim)]">Narração parou em {listenLabel}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {HUB_ITEMS.map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 hover:border-[var(--accent)]/60 hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <span className="text-[var(--accent)]">{item.icon}</span>
                  <span className="text-[10px] text-center text-[var(--text-secondary)] font-medium leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <div className="mt-8 w-full opacity-0 animate-[fadeIn_0.6s_ease_1.8s_forwards]">
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => setAuthMode("login")}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  authMode === "login" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode("register")}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  authMode === "register" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
                }`}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === "register" && (
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              )}
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg pl-3 pr-10 py-2.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text)]"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  title={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <button
                type="submit"
                className="w-full bg-[var(--accent)] text-white font-semibold py-2.5 rounded-lg text-xs hover:bg-[var(--accent-hover)] transition-colors"
              >
                {authMode === "login" ? "Entrar" : "Cadastrar"}
              </button>
            </form>

            {/* NÚMEROS REAIS DO ACERVO */}
            <div className="flex items-center justify-center gap-5 pt-8 text-center">
              <div>
                <div className="text-lg font-bold text-[var(--text)]">66</div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">livros</div>
              </div>
              <div className="w-px h-7 bg-[var(--border)]" />
              <div>
                <div className="text-lg font-bold text-[var(--text)]">425 mil</div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">palavras</div>
              </div>
              <div className="w-px h-7 bg-[var(--border)]" />
              <div>
                <div className="text-lg font-bold text-[var(--text)]">25 mil</div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">raízes</div>
              </div>
            </div>

            <p className="text-center text-[10px] text-[var(--text-dim)] pt-6">
              Powered by Ernandes Machado Arruda
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
