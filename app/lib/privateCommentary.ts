// Comentários de uso pessoal (Biblioteca privada), servidos por
// /api/privado/comentario só para quem está logado. Mesmo formato do
// comentário público, com o título da seção em "h":
//   { fonte, intro, chapters: { "<cap>": [ { s, e, h, t } ] } }
// e = 999 marca uma seção que atravessa capítulos.

export type PrivateBlock = { s: number; e: number; h: string; t: string };
type PrivateBook = { fonte: string; intro: string; chapters: Record<string, PrivateBlock[]> };

export type CommentarySource = "matthew-henry" | "comentario-pentecostal";

const NOVO_TESTAMENTO = new Set([
  "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios",
  "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito",
  "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse",
]);

export const COMMENTARY_SOURCES: { id: CommentarySource; label: string; covers: (book: string) => boolean }[] = [
  { id: "matthew-henry", label: "Matthew Henry", covers: () => true },
  { id: "comentario-pentecostal", label: "Pentecostal", covers: (b) => NOVO_TESTAMENTO.has(b) },
];

export type LoadResult = "ok" | "sem-login" | "indisponivel";

const cache = new Map<string, PrivateBook | null>();
const loading = new Map<string, Promise<LoadResult>>();

export function loadPrivateCommentary(source: CommentarySource, book: string): Promise<LoadResult> {
  const key = `${source}|${book}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key) ? "ok" : "indisponivel");
  const inFlight = loading.get(key);
  if (inFlight) return inFlight;
  const promise = fetch(`/api/privado/comentario?fonte=${encodeURIComponent(source)}&livro=${encodeURIComponent(book)}`, {
    credentials: "same-origin",
  })
    .then(async (res): Promise<LoadResult> => {
      if (res.status === 401) return "sem-login"; // não guarda: pode passar a valer depois do login
      const data = res.ok ? ((await res.json()) as PrivateBook) : null;
      cache.set(key, data);
      return data ? "ok" : "indisponivel";
    })
    .catch((): LoadResult => "indisponivel")
    .finally(() => loading.delete(key));
  loading.set(key, promise);
  return promise;
}

// A seção mais específica que contém o versículo; sem nenhuma, a última que
// começa antes dele no capítulo — ou uma seção longa que veio de capítulo
// anterior (e = 999).
export function getPrivateBlock(
  source: CommentarySource,
  book: string,
  chapter: number,
  verse: number
): (PrivateBlock & { c: number }) | null {
  const data = cache.get(`${source}|${book}`);
  if (!data) return null;
  const blocks = data.chapters[String(chapter)] ?? [];
  const containing = blocks.filter((b) => b.s <= verse && verse <= b.e);
  if (containing.length) return { ...containing.sort((a, b) => a.e - a.s - (b.e - b.s))[0], c: chapter };
  const before = blocks.filter((b) => b.s <= verse).sort((a, b) => b.s - a.s)[0];
  if (before) return { ...before, c: chapter };
  for (let c = chapter - 1; c >= 1; c--) {
    const longa = (data.chapters[String(c)] ?? []).filter((b) => b.e === 999).pop();
    if (longa) return { ...longa, c };
  }
  return null;
}

export function getPrivateIntro(source: CommentarySource, book: string): string | null {
  return cache.get(`${source}|${book}`)?.intro || null;
}
