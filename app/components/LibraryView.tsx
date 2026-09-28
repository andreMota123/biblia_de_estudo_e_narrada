import { useEffect, useState } from "react";
import { fontFamilyOf, FONT_SIZE_MAX, FONT_SIZE_MIN, type ReadingSettings } from "../lib/readingFonts";

// Biblioteca pessoal: livros de estudo guardados na pasta privada do servidor
// (/api/privado/biblioteca), visíveis só com o login do dono.

type Bloco = { t: string; h: 0 | 1 | 2 };
type Capitulo = { titulo: string; parte?: string | null; blocos?: Bloco[] };
type Livro = { id: string; titulo: string; subtitulo?: string; autor?: string; fonte?: string; capitulos: Capitulo[] };

const POS_KEY = "biblia-origens-biblioteca-posicao";

function lerPosicoes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
  } catch {
    return {};
  }
}

type Props = { reading: ReadingSettings; onReadingChange: (s: ReadingSettings) => void };

export default function LibraryView({ reading, onReadingChange }: Props) {
  const [lista, setLista] = useState<Livro[] | "sem-login" | null>(null);
  const [livro, setLivro] = useState<Livro | null>(null);
  const [cap, setCap] = useState(0);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/privado/biblioteca", { credentials: "same-origin" })
      .then(async (r) => (r.status === 401 ? "sem-login" : ((await r.json()).livros as Livro[])))
      .then((v) => !cancelado && setLista(v))
      .catch(() => !cancelado && setLista([]));
    return () => {
      cancelado = true;
    };
  }, []);

  const abrir = async (id: string) => {
    const r = await fetch(`/api/privado/biblioteca?id=${encodeURIComponent(id)}`, { credentials: "same-origin" });
    if (!r.ok) return;
    const l = (await r.json()) as Livro;
    setLivro(l);
    setCap(Math.min(lerPosicoes()[id] ?? 0, l.capitulos.length - 1));
  };

  const irPara = (i: number) => {
    if (!livro) return;
    setCap(i);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ ...lerPosicoes(), [livro.id]: i }));
    } catch {
      // só não lembra a posição
    }
    document.getElementById("biblioteca-topo")?.scrollIntoView({ block: "start" });
  };

  const estilo = { fontSize: `${reading.fontSize}px`, fontFamily: fontFamilyOf(reading.font), lineHeight: 1.7 };

  if (lista === null) return <main className="flex-1 p-6 text-sm text-[var(--text-muted)]">Carregando a Biblioteca...</main>;
  if (lista === "sem-login") {
    return <main className="flex-1 p-6 text-sm text-[var(--text-muted)]">A Biblioteca é pessoal: entre com o seu login para ver.</main>;
  }

  // LISTA DE LIVROS
  if (!livro) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-serif font-bold text-[var(--text)]">Biblioteca</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 mb-5">Seus livros de estudo — visíveis só com o seu login.</p>
        {lista.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nenhum livro na Biblioteca ainda.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((l) => (
            <button
              key={l.id}
              onClick={() => abrir(l.id)}
              className="text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 hover:border-[var(--accent)]/60"
            >
              <p className="font-serif font-bold text-[var(--text)]">{l.titulo}</p>
              {l.subtitulo && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{l.subtitulo}</p>}
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                {l.autor} · {l.capitulos.length} seções
              </p>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // LEITURA DE UM LIVRO
  const atual = livro.capitulos[cap];
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div id="biblioteca-topo" className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          <button onClick={() => setLivro(null)} className="text-xs text-[var(--accent)] hover:underline">
            ← Biblioteca
          </button>
          <span className="text-xs text-[var(--text-muted)] truncate flex-1 min-w-0">{livro.titulo}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onReadingChange({ ...reading, fontSize: Math.max(FONT_SIZE_MIN, reading.fontSize - 1) })}
              className="w-8 h-8 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text)]"
              aria-label="Diminuir a letra"
            >
              A−
            </button>
            <button
              onClick={() => onReadingChange({ ...reading, fontSize: Math.min(FONT_SIZE_MAX, reading.fontSize + 1) })}
              className="w-8 h-8 rounded-lg border border-[var(--border)] text-sm font-bold text-[var(--text)]"
              aria-label="Aumentar a letra"
            >
              A+
            </button>
          </div>
        </div>

        <select
          id="biblioteca-capitulo"
          value={cap}
          onChange={(e) => irPara(Number(e.target.value))}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-xs rounded-lg px-3 py-2"
          aria-label="Capítulo"
        >
          {livro.capitulos.map((c, i) => (
            <option key={i} value={i}>
              {c.titulo}
            </option>
          ))}
        </select>

        {atual.parte && <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">{atual.parte}</p>}
        <h2 className="text-xl md:text-2xl font-serif font-bold text-[var(--text)]">{atual.titulo}</h2>

        <article className="space-y-3 text-[var(--text-secondary)]" style={estilo}>
          {(atual.blocos ?? []).map((b, i) =>
            b.h === 1 ? (
              <h3 key={i} className="pt-3 font-bold text-[var(--text)] uppercase tracking-wide" style={{ fontSize: "0.85em" }}>
                {b.t}
              </h3>
            ) : b.h === 2 ? (
              <h4 key={i} className="pt-1 font-bold text-[var(--text)]">
                {b.t}
              </h4>
            ) : (
              <p key={i}>{b.t}</p>
            )
          )}
        </article>

        <div className="flex justify-between gap-2 pt-4 border-t border-[var(--border)]">
          <button
            disabled={cap === 0}
            onClick={() => irPara(cap - 1)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            disabled={cap >= livro.capitulos.length - 1}
            onClick={() => irPara(cap + 1)}
            className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold disabled:opacity-40"
          >
            Próximo →
          </button>
        </div>
        {livro.fonte && <p className="text-[10px] text-[var(--text-dim)]">{livro.fonte}</p>}
      </div>
    </main>
  );
}
