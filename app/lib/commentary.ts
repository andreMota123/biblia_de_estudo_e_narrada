// Comentário bíblico clássico de Matthew Henry (1662-1714), domínio
// público, obtido via Free Use Bible API (bible.helloao.org / projeto
// HelloAOLab, licença MIT / CC Public Domain Mark). Cobre 65 dos 66 livros
// — a fonte não inclui comentário para Cânticos dos Cânticos.
//
// Cada bloco de comentário cobre um intervalo de versículos (s = início,
// e = fim), não um versículo isolado — assim como no original de Matthew
// Henry, que comentava passagens inteiras de uma vez.

// t_pt_auto: tradução feita por IA local (scripts/traduzir-comentario.py);
// o app avisa e deixa ver o original em inglês.
export type CommentaryBlock = { s: number; e: number; t: string; t_pt?: string; t_pt_auto?: boolean };

type CommentaryBook = {
  intro: string;
  intro_pt?: string;
  chapters: Record<string, CommentaryBlock[]>;
};

const cache = new Map<string, CommentaryBook | null>();
const loading = new Map<string, Promise<CommentaryBook | null>>();

// Carrega (ou reaproveita do cache) o comentário de um livro a partir de
// /public/commentary/matthew-henry/{Livro}.json. Retorna null se o livro
// não tiver comentário nesta fonte (só Cânticos, atualmente).
export function loadCommentaryBook(bookName: string): Promise<CommentaryBook | null> {
  if (cache.has(bookName)) return Promise.resolve(cache.get(bookName)!);

  const inFlight = loading.get(bookName);
  if (inFlight) return inFlight;

  const promise = fetch(`/commentary/matthew-henry/${encodeURIComponent(bookName)}.json`)
    .then((res) => (res.ok ? (res.json() as Promise<CommentaryBook>) : null))
    .then((data) => {
      cache.set(bookName, data ?? null);
      loading.delete(bookName);
      return data ?? null;
    })
    .catch(() => {
      cache.set(bookName, null);
      loading.delete(bookName);
      return null;
    });

  loading.set(bookName, promise);
  return promise;
}

// Retorna o bloco de comentário (já carregado) que cobre um versículo
// específico, ou null se o livro/capítulo não tiver comentário cadastrado
// ou ainda não tiver sido carregado.
export function getCommentaryForVerse(
  bookName: string,
  chapter: number,
  verse: number
): CommentaryBlock | null {
  const book = cache.get(bookName);
  if (!book) return null;
  const blocks = book.chapters[String(chapter)];
  if (!blocks) return null;
  return blocks.find((b) => verse >= b.s && verse <= b.e) ?? null;
}

export function getCommentaryIntro(bookName: string): string | null {
  return cache.get(bookName)?.intro || null;
}

// A fonte em inglês traz 38 blocos (~0,9% do total) cujo texto termina
// truncado, às vezes no meio de uma palavra. É um defeito do próprio
// texto-fonte, não do nosso processamento: sinalizamos isso ao leitor em
// vez de deixá-lo achar que falta conteúdo por erro do app.
export function isBlockTruncated(block: CommentaryBlock): boolean {
  const text = (block.t_pt || block.t).trim();
  if (!text) return false;
  return !/[.!?"'’”)\]]$/.test(text);
}

// Pede a tradução de UM bloco sob demanda: a rota de API primeiro olha um
// cache compartilhado no Supabase (rápido, grátis) e só chama a IA se
// ninguém ainda pediu a tradução daquele bloco específico. O resultado
// fica salvo pra sempre — a próxima pessoa a abrir o mesmo versículo já
// recebe pronto.
export async function translateBlockOnDemand(
  book: string,
  chapter: number,
  block: CommentaryBlock
): Promise<{ text_pt: string; truncated: boolean } | { error: string }> {
  try {
    const res = await fetch("/api/translate-commentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, chapter, s: block.s, e: block.e, text: block.t }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || `Erro ${res.status}` };
    return { text_pt: data.text_pt, truncated: data.truncated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro de rede" };
  }
}
