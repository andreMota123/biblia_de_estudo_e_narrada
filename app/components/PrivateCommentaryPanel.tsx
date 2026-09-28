import { useEffect, useState } from "react";
import CommentaryAudioBox from "./CommentaryAudioBox";
import { getPrivateBlock, getPrivateIntro, loadPrivateCommentary, type CommentarySource, type LoadResult } from "../lib/privateCommentary";

type Props = {
  source: CommentarySource;
  book: string;
  chapter: number;
  verse: number | null;
  textStyle: React.CSSProperties;
  narrationRate: number;
  onAudioStart: () => void;
};

// Comentário de uso pessoal, carregado
// da Biblioteca privada. Mostra a seção que cobre o versículo escolhido.
export default function PrivateCommentaryPanel({ source, book, chapter, verse, textStyle, narrationRate, onAudioStart }: Props) {
  const [loaded, setLoaded] = useState<{ key: string; result: LoadResult } | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const key = `${source}|${book}`;

  useEffect(() => {
    let cancelled = false;
    loadPrivateCommentary(source, book).then((result) => {
      if (!cancelled) setLoaded({ key, result });
    });
    return () => {
      cancelled = true;
    };
  }, [source, book, key]);

  if (loaded?.key !== key) return <p className="text-[var(--text-dim)]">Carregando...</p>;
  if (loaded.result === "sem-login") {
    return <p className="text-[var(--text-muted)]">Este comentário é da sua Biblioteca pessoal: entre com o seu login para ver.</p>;
  }
  if (loaded.result === "indisponivel") {
    return <p className="text-[var(--text-muted)]">Este comentário não cobre {book}.</p>;
  }

  const block = verse ? getPrivateBlock(source, book, chapter, verse) : null;
  const intro = getPrivateIntro(source, book);
  const titulo = block?.h.replace(/^[\d.]+\s*/, "");
  const texto = block?.t.replace(/^[.\s]+/, "");

  return (
    <div>
      {intro && (
        <button onClick={() => setShowIntro((v) => !v)} className="mb-3 text-[10px] font-medium text-[var(--accent)] hover:underline">
          {showIntro ? "Esconder a introdução do livro" : `Ler a introdução de ${book}`}
        </button>
      )}
      {showIntro && intro && (
        <p className="mb-4 text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--border-strong)] pl-3" style={textStyle}>
          {intro}
        </p>
      )}
      {!block ? (
        <p className="text-[var(--text-muted)]">Nenhuma seção deste comentário para este versículo.</p>
      ) : (
        <>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">
            {book} {block.c}:{block.s}
            {block.e === 999 ? " em diante" : block.e !== block.s ? `-${block.e}` : ""}
          </p>
          <h4 className="font-serif font-bold text-sm text-[var(--text)] mb-2">{titulo}</h4>
          <CommentaryAudioBox
            audioKey={`${source}-${book}-${block.c}-${block.s}`}
            src={`/api/comentario-audio?fonte=${source}&livro=${encodeURIComponent(book)}&cap=${block.c}&s=${block.s}`}
            rate={narrationRate}
            onStart={onAudioStart}
          />
          <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line" style={textStyle}>
            {texto}
          </p>
        </>
      )}
    </div>
  );
}
