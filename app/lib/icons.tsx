export const BookOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const AcademicCapIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
);

export const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-dim)]"}`} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

export const HighlighterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l6-6 4 4-6 6H9v-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 21h6M4.5 17.5L9 13l2 2-4.5 4.5H4.5v-2z" />
  </svg>
);

export const NoteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 13.5V19a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 19V7.5A1.5 1.5 0 016 6h5.5" />
  </svg>
);

export const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

// LOGO DE OLIVEIRA BASEADO NA ILUSTRAÇÃO DETALHADA
export const AppLogo = () => (
  <div className="relative w-11 h-11 bg-gradient-to-b from-[var(--accent-hover)] to-[var(--accent-deep)] rounded-[12px] flex items-center justify-center shadow-lg shrink-0 ring-1 ring-white/20 ring-inset">
    {/* Marca: a letra hebraica Álef (א) — primeira letra do alfabeto hebraico,
        primeira palavra da Torá começa com ela. Identidade própria do app,
        não um clipart de livro genérico. */}
    <span className="font-serif text-[28px] font-bold leading-none text-white select-none drop-shadow-sm" style={{ transform: "translateY(-1px)" }}>
      א
    </span>
    {/* brilho sutil no topo, estilo ícone iOS */}
    <div className="absolute inset-x-1 top-1 h-1/3 rounded-full bg-white/15 blur-[2px] pointer-events-none" />
  </div>
);

// Versão animada do logo pra tela inicial: o Álef se desenha traço por
// traço (efeito de "vídeo se formando"), depois o quadrado ganha
// preenchimento e brilho. Usa a mesma marca (Álef), não um ícone novo.
export const AnimatedLogo = () => (
  <div className="relative w-24 h-24">
    <div
      className="absolute inset-0 rounded-[26px] bg-gradient-to-b from-[var(--accent-hover)] to-[var(--accent-deep)] opacity-0 shadow-2xl ring-1 ring-white/20 ring-inset"
      style={{ animation: "logoBoxIn 0.6s ease 0s forwards" }}
    />
    <div
      className="absolute inset-x-3 top-3 h-1/3 rounded-full bg-white/15 blur-[3px] opacity-0 pointer-events-none"
      style={{ animation: "fadeIn 0.5s ease 0.9s forwards" }}
    />
    {/* A letra real (mesma fonte do logo estático) "sobe" revelando-se de
        baixo pra cima, como se estivesse se materializando — em vez de
        tentar desenhar o traçado à mão, o que não estava saindo parecido
        com um Álef de verdade. */}
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[26px]">
      <span
        className="font-serif text-[60px] font-bold leading-none text-white select-none drop-shadow-sm"
        style={{
          transform: "translateY(-2px)",
          animation: "revealUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.35s forwards",
        }}
      >
        א
      </span>
    </div>
  </div>
);export const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 2.5V5M12 19V21.5M21.5 12H19M5 12H2.5M18.5 5.5L16.8 7.2M7.2 16.8L5.5 18.5M18.5 18.5L16.8 16.8M7.2 7.2L5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

// --- ÍCONES DO PLAYER DE ÁUDIO ---

export const HeadphonesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 18v-6a9 9 0 0118 0v6" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
  </svg>
);

export const PlayIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v13.72a1 1 0 001.5.86l11.14-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" />
  </svg>
);

export const PauseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </svg>
);

export const StopIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const PrevIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 5h2v14H6zM20 5.9v12.2a.9.9 0 01-1.38.76L9.7 12.76a.9.9 0 010-1.52l8.92-5.1A.9.9 0 0120 5.9z" />
  </svg>
);

export const NextIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 5h2v14h-2zM4 5.9v12.2a.9.9 0 001.38.76l8.92-5.1a.9.9 0 000-1.52L5.38 5.14A.9.9 0 004 5.9z" />
  </svg>
);

export const MoonTimerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 14.5A8.5 8.5 0 119.5 4a6.6 6.6 0 0010.5 10.5z" />
  </svg>
);

export const EyeIcon = ({ open }: { open: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" strokeWidth="2" />
    {!open && <path strokeLinecap="round" strokeWidth="2" d="M4 4l16 16" />}
  </svg>
);

export const LibraryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19V5a1 1 0 011-1h3a1 1 0 011 1v14M9 19V7a1 1 0 011-1h3a1 1 0 011 1v12" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.5 6.8l2.9-.8a1 1 0 011.2.7l3 11.5a1 1 0 01-.7 1.2l-2.9.8a1 1 0 01-1.2-.7l-3-11.5a1 1 0 01.7-1.2zM3 20h11" />
  </svg>
);
