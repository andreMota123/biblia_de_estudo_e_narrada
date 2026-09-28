type AuthNoticeProps = {
  message: string;
  onGoToLogin: () => void;
};

export default function AuthNotice({ message, onGoToLogin }: AuthNoticeProps) {
  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-50 bg-[var(--bg-elevated)] text-[var(--text)] border border-[var(--accent)]/60 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md animate-bounce">
      <div className="text-amber-400">⚠️</div>
      <div className="flex-1 text-xs">
        <p className="font-semibold">{message}</p>
        <p className="text-[10px] text-[var(--text-muted)]">Faça login para habilitar o caderno de estudos pessoal.</p>
      </div>
      <button
        onClick={onGoToLogin}
        className="bg-[var(--accent)] text-white font-bold px-2.5 py-1 rounded text-[10px] hover:bg-[var(--accent-hover)]"
      >
        Entrar
      </button>
    </div>
  );
}
