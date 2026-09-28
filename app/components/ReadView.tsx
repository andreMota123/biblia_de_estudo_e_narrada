import { useEffect, useRef, useState } from "react";
import type {
  ActiveSidePanel,
  BibleData,
  ContextInfo,
  HighlightColor,
  InterlinearWord,
  ReferenceItem,
  UserData,
  VerseNote,
} from "../types";
import { getInterlinearWords } from "../lib/lexicon";
import { decodeMorphology } from "../lib/morphology";
import { translateGloss, splitCompoundGloss } from "../lib/glossTranslation";
import { loadOccurrencesForClassic, type Occurrence } from "../lib/occurrences";
import { classicStrongOf, loadClassicGroups, loadDictionaryEntry, type DictionaryEntry } from "../lib/dictionary";
import { getCuratedEntry } from "../lib/curatedDictionary";
import { loadCommentaryBook, getCommentaryForVerse, getCommentaryIntro, isBlockTruncated, translateBlockOnDemand, type CommentaryBlock } from "../lib/commentary";
import { formatTranslit } from "../lib/format";
import { studyBlocksToPlainText, parseStudyBlocks } from "../lib/studyBlocks";
import StudyEditor from "./StudyEditor";
import { HeadphonesIcon, LinkIcon, StarIcon } from "../lib/icons";

type ReadViewProps = {
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number | null;
  setSelectedVerse: (v: number) => void;
  currentLanguage: string;
  currentChapterVerses: Record<string, string>;
  userData: UserData;
  activeSidePanel: ActiveSidePanel;
  setActiveSidePanel: (p: ActiveSidePanel) => void;
  toggleFavorite: (verseNum: number) => void;
  setHighlight: (verseNum: number, color: HighlightColor) => void;
  setSelectedWord: (w: InterlinearWord | null) => void;
  selectedWord: InterlinearWord | null;
  typedContextData: Record<string, ContextInfo>;
  currentVerseKey: string | null;
  currentVerseNote: VerseNote | null;
  saveStudyText: (text: string) => void;
  currentReferences: ReferenceItem[];
  // Incrementado pelo componente pai sempre que o léxico interlinear de um
  // livro termina de carregar. Não é lido diretamente aqui — sua única função
  // é forçar este componente a re-renderizar e reconsultar getInterlinearWords.
  lexiconVersion: number;
  navigateToVerse: (book: string, chapter: number, verse: number, openStudy?: boolean) => void;
  bibleData: BibleData;
  wordNotes: Record<string, string>;
  saveWordNote: (strong: string, note: string) => void;
  // Versículo deste capítulo que está sendo narrado agora (ou null).
  audioVerse: number | null;
  onListenFrom: (verse: number) => void;
};

function refLabel(o: Occurrence): string {
  return `${o.b} ${o.c}:${o.v}`;
}

export default function ReadView({
  selectedBook,
  selectedChapter,
  selectedVerse,
  setSelectedVerse,
  currentLanguage,
  currentChapterVerses,
  userData,
  activeSidePanel,
  setActiveSidePanel,
  toggleFavorite,
  setHighlight,
  setSelectedWord,
  selectedWord,
  typedContextData,
  currentVerseKey,
  currentVerseNote,
  saveStudyText,
  currentReferences,
  lexiconVersion,
  navigateToVerse,
  bibleData,
  wordNotes,
  saveWordNote,
  audioVerse,
  onListenFrom,
}: ReadViewProps) {
  // Acompanha a narração: mantém o versículo narrado visível na tela.
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
  useEffect(() => {
    if (audioVerse === null) return;
    const el = verseRefs.current[audioVerse];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 120;
    if (rect.top < margin || rect.bottom > window.innerHeight - margin) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [audioVerse]);

  const [wordTab, setWordTab] = useState<"definicao" | "ocorrencias">("definicao");
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);
  const [dictLang, setDictLang] = useState<"pt" | "en">("pt");
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
  const [dictFetchedFor, setDictFetchedFor] = useState<string | null>(null);
  const fetchingStrongRef = useRef<string | null>(null);
  const fetchingDictRef = useRef<string | null>(null);
  const [commentaryLoadedFor, setCommentaryLoadedFor] = useState<string | null>(null);
  const fetchingCommentaryRef = useRef<string | null>(null);
  const [translatingBlock, setTranslatingBlock] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [, bumpTranslation] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);

  // Carrega o comentário de Matthew Henry do livro atual assim que o
  // painel de comentário é aberto (um arquivo por livro, reaproveitado do
  // cache do módulo entre capítulos/versículos).
  useEffect(() => {
    if (activeSidePanel !== "commentary" || commentaryLoadedFor === selectedBook) return;
    if (fetchingCommentaryRef.current === selectedBook) return;
    fetchingCommentaryRef.current = selectedBook;
    let cancelled = false;
    loadCommentaryBook(selectedBook).then(() => {
      if (!cancelled) setCommentaryLoadedFor(selectedBook);
      fetchingCommentaryRef.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [activeSidePanel, selectedBook, commentaryLoadedFor]);

  // Sempre que uma nova palavra é selecionada, volta pra aba Definição e
  // reseta as ocorrências/dicionário carregados (evita mostrar os da palavra
  // anterior). Ajuste de estado feito durante a renderização (não num
  // efeito) seguindo o padrão recomendado pelo React para "resetar estado
  // quando uma prop muda".
  const [trackedWord, setTrackedWord] = useState(selectedWord);
  if (trackedWord !== selectedWord) {
    setTrackedWord(selectedWord);
    setWordTab("definicao");
    setOccurrences(null);
    setDictEntry(null);
    setDictFetchedFor(null);
  }

  // Carrega a entrada de dicionário completa (BDB/Abbott-Smith via
  // STEPBible) assim que uma palavra é selecionada. dictFetchedFor marca que
  // a busca terminou (com ou sem resultado) — sem isso, uma palavra que
  // legitimamente não está no dicionário ficava presa em "Carregando..."
  // pra sempre, porque null de "não achou" e null de "ainda não buscou"
  // eram indistinguíveis.
  useEffect(() => {
    const strong = selectedWord?.strong;
    if (!strong || dictFetchedFor === strong || fetchingDictRef.current === strong) return;
    fetchingDictRef.current = strong;
    let cancelled = false;
    loadDictionaryEntry(strong).then((entry) => {
      if (!cancelled) {
        setDictEntry(entry);
        setDictFetchedFor(strong);
      }
      fetchingDictRef.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [selectedWord?.strong, dictFetchedFor]);

  useEffect(() => {
    const strong = selectedWord?.strong;
    if (wordTab !== "ocorrencias" || !strong || occurrences) return;
    if (fetchingStrongRef.current === strong) return;
    fetchingStrongRef.current = strong;
    let cancelled = false;
    loadClassicGroups().then(async (groups) => {
      const classic = classicStrongOf(strong);
      const siblings = groups?.[classic] ?? [strong];
      const data = await loadOccurrencesForClassic(siblings);
      if (!cancelled) setOccurrences(data);
      fetchingStrongRef.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [wordTab, selectedWord?.strong, occurrences]);

  const openWord = (word: InterlinearWord) => {
    setSelectedWord(word);
    setActiveSidePanel("word");
  };

  const renderVerseContent = (vKey: string, vText: string, expanded: boolean) => {
    if (!expanded) {
      return <p className="text-sm leading-relaxed font-serif text-[var(--text-secondary)]">{vText}</p>;
    }

    const words = getInterlinearWords(vKey);

    if (!words) {
      const lexiconStillLoading = lexiconVersion === 0;
      return (
        <div>
          <p className="text-sm leading-relaxed font-serif text-[var(--text-secondary)]">{vText}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">
            {lexiconStillLoading
              ? "Carregando léxico interlinear do livro..."
              : "Análise interlinear ainda não cadastrada para este versículo."}
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-xs text-[var(--text-muted)] italic mb-2 leading-snug">{vText}</p>
        <div className="flex flex-wrap gap-y-3 gap-x-2 justify-start" dir={currentLanguage === "Hebraico" ? "rtl" : "ltr"}>
          {words.map((word, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                openWord(word);
              }}
              className={`flex flex-col items-center px-2 py-1.5 rounded-lg border transition-colors ${
                selectedWord === word
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]"
                  : "border-transparent hover:bg-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span className={`text-base font-serif font-bold ${word.isJesusWords ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
                {word.original}
              </span>
              <span className="text-[10px] italic text-[var(--text-muted)] mt-0.5">({formatTranslit(word.translit)})</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderPanelInner = () => (
    <>
        <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-2">
          <h3 className="font-serif font-bold text-sm text-[var(--text)] uppercase tracking-wide">
            {activeSidePanel === "context" && "Contexto do Livro"}
            {activeSidePanel === "study" && `Caderno de Estudo - ${selectedBook} ${selectedChapter}:${selectedVerse}`}
            {activeSidePanel === "references" && `Referências de ${selectedBook} ${selectedChapter}:${selectedVerse}`}
            {activeSidePanel === "commentary" && `Comentário de ${selectedBook} ${selectedChapter}:${selectedVerse}`}
            {activeSidePanel === "word" && "Palavra Original"}
          </h3>
          <button onClick={() => setActiveSidePanel("none")} className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
            ✕ Fechar
          </button>
        </div>

        {/* PAINEL DE CONTEXTO */}
        {activeSidePanel === "context" && (
          <div className="space-y-4 text-xs text-[var(--text-secondary)]">
            {typedContextData[selectedBook] ? (
              <>
                <p><strong className="text-[var(--accent)]">Autor:</strong> {typedContextData[selectedBook].author}</p>
                <p><strong className="text-[var(--accent)]">Data aproximada:</strong> {typedContextData[selectedBook].date}</p>
                <p><strong className="text-[var(--accent)]">Tema principal:</strong> {typedContextData[selectedBook].theme}</p>
                <div className="pt-2 border-t border-[var(--border)]">
                  <strong className="block mb-1 text-[var(--accent)]">Introdução:</strong>
                  <p className="leading-relaxed text-[var(--text-muted)]">{typedContextData[selectedBook].introduction}</p>
                </div>
                <div className="pt-2 border-t border-[var(--border)]">
                  <strong className="block mb-1 text-[var(--accent)]">Contexto Histórico:</strong>
                  <p className="leading-relaxed text-[var(--text-muted)]">{typedContextData[selectedBook].historicalContext}</p>
                </div>
              </>
            ) : (
              <p className="text-[var(--text-muted)]">Informações contextuais detalhadas para {selectedBook} em catalogação exegética.</p>
            )}
          </div>
        )}

        {/* PAINEL DE ESTUDO DO VERSÍCULO */}
        {activeSidePanel === "study" && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)] italic border-b border-[var(--border)] pb-2">
              &ldquo;{currentVerseKey && currentChapterVerses[selectedVerse || 1]}&rdquo;
            </p>
            <div>
              <label className="text-xs font-bold text-[var(--accent)] block mb-1">Sua Anotação Exegética:</label>
              <div className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3 focus-within:border-[var(--accent)]">
                <StudyEditor value={currentVerseNote?.study} onChange={saveStudyText} />
              </div>
              <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
                Enter cria um novo bloco · Backspace num bloco vazio apaga ele · use os botões H / P / • pra trocar o tipo.
              </p>
            </div>
          </div>
        )}

        {/* PAINEL DE REFERÊNCIAS CRUZADAS */}
        {activeSidePanel === "references" && (
          <div className="space-y-3">
            {currentReferences.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Nenhuma referência cruzada cadastrada para este versículo ainda.
              </p>
            ) : (
              currentReferences.map((ref, i) => {
                const m = ref.passage.match(/^(.+)\s(\d+):(\d+)$/);
                return (
                  <button
                    key={i}
                    onClick={() => m && navigateToVerse(m[1], Number(m[2]), Number(m[3]))}
                    className="w-full text-left p-3 bg-[var(--bg-elevated)]/60 backdrop-blur-md border border-[var(--border)] rounded-xl text-xs space-y-1 hover:border-[var(--accent)]/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--accent)]">
                      <LinkIcon /> {ref.passage}
                    </div>
                    <p className="text-[var(--text-muted)] italic">{ref.text}</p>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* PAINEL DE COMENTÁRIO (Matthew Henry, domínio público) */}
        {activeSidePanel === "commentary" && (
          <div className="space-y-3 text-xs">
            {commentaryLoadedFor !== selectedBook ? (
              <p className="text-[var(--text-dim)]">Carregando...</p>
            ) : (
              (() => {
                const block: CommentaryBlock | null = selectedVerse
                  ? getCommentaryForVerse(selectedBook, selectedChapter, selectedVerse)
                  : null;
                if (!block) {
                  return (
                    <p className="text-[var(--text-muted)]">
                      {getCommentaryIntro(selectedBook) === null
                        ? "Este livro não tem comentário de Matthew Henry cadastrado nesta fonte."
                        : "Nenhum comentário cadastrado para este versículo."}
                    </p>
                  );
                }
                return (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                      {selectedBook} {selectedChapter}:{block.s}
                      {block.e !== block.s ? `-${block.e}` : ""}
                      {!block.t_pt && (
                        <span className="ml-2 normal-case font-normal text-[var(--text-dim)]">(ainda só em inglês)</span>
                      )}
                      {block.t_pt && block.t_pt_auto && (
                        <span className="ml-2 normal-case font-normal text-[var(--text-dim)]">(tradução automática)</span>
                      )}
                    </p>
                    <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                      {block.t_pt && !showOriginal ? block.t_pt : block.t}
                    </p>
                    {block.t_pt && (
                      <button
                        onClick={() => setShowOriginal((v) => !v)}
                        className="mt-2 text-[10px] font-medium text-[var(--accent)] hover:underline"
                      >
                        {showOriginal ? "Ver em português" : "Ver o original em inglês"}
                      </button>
                    )}
                    {isBlockTruncated(block) && (
                      <p className="mt-2 text-[10px] text-[var(--text-muted)] italic border-l-2 border-[var(--border-strong)] pl-2">
                        O texto termina aqui de forma abrupta na própria fonte original — não é falha do
                        app nem da tradução.
                      </p>
                    )}
                    {!block.t_pt && (() => {
                      const blockKey = `${selectedBook}-${selectedChapter}-${block.s}`;
                      const isTranslating = translatingBlock === blockKey;
                      return (
                        <div className="mt-3 pt-2 border-t border-[var(--border)]">
                          <button
                            disabled={isTranslating}
                            onClick={async () => {
                              setTranslateError(null);
                              setTranslatingBlock(blockKey);
                              const result = await translateBlockOnDemand(selectedBook, selectedChapter, block);
                              setTranslatingBlock(null);
                              if ("error" in result) {
                                setTranslateError(result.error);
                              } else {
                                block.t_pt = result.text_pt;
                                bumpTranslation((n) => n + 1);
                              }
                            }}
                            className="text-xs bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-60"
                          >
                            {isTranslating ? "Traduzindo..." : "Traduzir para português"}
                          </button>
                          {translateError && translatingBlock === null && (
                            <p className="mt-1.5 text-[10px] text-[var(--danger)]">Falha ao traduzir: {translateError}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()
            )}
            <p className="text-[10px] text-[var(--text-dim)] pt-2 border-t border-[var(--border)]">
              Fonte: Matthew Henry, Comentário Bíblico (falecido em 1714), domínio público, obtido via
              Free Use Bible API (HelloAO Lab). Não cobre Cânticos dos Cânticos, que não recebeu
              comentário na fonte original. Tradução para o português em andamento, livro por livro —
              onde ainda não chegou, o texto aparece em inglês.
            </p>
          </div>
        )}

        {/* PAINEL DE PALAVRA ORIGINAL (Definição / Ocorrências) */}
        {activeSidePanel === "word" && selectedWord && (
          <div>
            <div className="relative text-center pb-4 border-b border-[var(--border)] mb-3 -mx-4 px-4 pt-2 overflow-hidden">
              <div
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-64 h-40 opacity-25 blur-3xl"
                style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
              />
              <div className={`relative text-4xl font-serif font-bold mb-1 ${selectedWord.isJesusWords ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
                {selectedWord.original}
              </div>
              <div className="relative text-xs text-[var(--text-muted)] italic">
                {formatTranslit(selectedWord.translit)}
                {selectedWord.strong && (
                  <span className="ml-2 text-[10px] font-mono bg-[var(--border)] text-[var(--accent)] px-1.5 py-0.5 rounded">
                    {classicStrongOf(selectedWord.strong)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)]">
              <div className="flex gap-1">
                <button
                  onClick={() => setWordTab("definicao")}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${
                    wordTab === "definicao" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"
                  }`}
                >
                  Definição
                </button>
                <button
                  onClick={() => setWordTab("ocorrencias")}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${
                    wordTab === "ocorrencias" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"
                  }`}
                >
                  Ocorrências{occurrences ? ` (${occurrences.length})` : ""}
                </button>
              </div>

              {wordTab === "definicao" && (
                <div className="flex items-center bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border)] mb-1.5">
                  <button
                    onClick={() => setDictLang("pt")}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${dictLang === "pt" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
                  >
                    PT
                  </button>
                  <button
                    onClick={() => setDictLang("en")}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${dictLang === "en" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
                  >
                    EN
                  </button>
                </div>
              )}
            </div>

            {wordTab === "definicao" && (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    Sentido neste versículo
                  </p>
                  {(() => {
                    const { core, prefix } = splitCompoundGloss(selectedWord.translation);
                    const g = translateGloss(core);
                    const p = prefix ? translateGloss(prefix) : null;
                    return (
                      <p className="text-[var(--text)] text-sm">
                        {p && <span className="text-[var(--text-muted)]">{p.text} · </span>}
                        {g.text}
                        {!g.translated && (
                          <span className="ml-1.5 text-[9px] font-bold text-[var(--text-muted)] align-middle border border-[var(--border)] rounded px-1 py-0.5">
                            EN
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>

                {selectedWord.morphology && (
                  <div className="pt-2.5 border-t border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                      Como esta forma é construída
                    </p>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {decodeMorphology(selectedWord.morphology, selectedWord.strong?.startsWith("H") ? "hebrew" : "greek")}
                    </p>
                  </div>
                )}

                <div className="pt-2.5 border-t border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    Forma de dicionário
                  </p>
                  {dictEntry ? (
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-serif text-lg text-[var(--text)]">{dictEntry.headword}</span>
                        <span className="text-[var(--text-muted)] italic">{formatTranslit(dictEntry.translit)}</span>
                        <span className="text-[var(--text-dim)]">
                          {dictEntry.pos.includes("N-F") ? "substantivo feminino"
                            : dictEntry.pos.includes("N-M") ? "substantivo masculino"
                            : dictEntry.pos.includes("V") ? "verbo"
                            : dictEntry.pos.includes("A") ? "adjetivo"
                            : dictEntry.pos}
                        </span>
                      </div>
                      {(() => {
                        const curated = getCuratedEntry(selectedWord.strong);
                        if (dictLang === "pt" && curated) {
                          return (
                            <div className="mt-1.5">
                              <p className="text-[var(--text)] font-medium">{curated.gloss}</p>
                              <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">{curated.note}</p>
                            </div>
                          );
                        }
                        if (dictLang === "pt" && !curated) {
                          return (
                            <p className="text-[var(--text-dim)] text-[10px] mt-1.5 italic">
                              Ainda não temos tradução curada em português pra esta palavra — abaixo, o
                              original em inglês.
                            </p>
                          );
                        }
                        return null;
                      })()}
                      {(dictLang === "en" || !getCuratedEntry(selectedWord.strong)) && (
                        <p className="text-[var(--text-secondary)] leading-relaxed mt-1.5">
                          {dictEntry.gloss}
                          <span className="ml-1.5 text-[9px] font-bold text-[var(--text-muted)] align-middle border border-[var(--border)] rounded px-1 py-0.5">
                            EN
                          </span>
                        </p>
                      )}
                    </div>
                  ) : selectedWord.meaning ? (
                    (() => {
                      const m = translateGloss(selectedWord.meaning);
                      return (
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                          {m.text}
                          {!m.translated && (
                            <span className="ml-1.5 text-[9px] font-bold text-[var(--text-muted)] align-middle border border-[var(--border)] rounded px-1 py-0.5">
                              EN
                            </span>
                          )}
                        </p>
                      );
                    })()
                  ) : dictFetchedFor === selectedWord.strong ? (
                    <p className="text-[var(--text-dim)]">Sem entrada de dicionário cadastrada para esta palavra.</p>
                  ) : (
                    <p className="text-[var(--text-dim)]">Carregando...</p>
                  )}
                </div>

                {dictEntry?.def && (
                  <details className="pt-2.5 border-t border-[var(--border)]">
                    <summary className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer select-none">
                      Definição completa (inglês) — toque para expandir
                    </summary>
                    <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line mt-2 max-h-64 overflow-y-auto pr-1">
                      {dictEntry.def}
                    </p>
                  </details>
                )}

                {selectedWord.strong && (
                  <div className="pt-2.5 border-t border-[var(--border)]">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                      Sua nota sobre esta palavra
                    </label>
                    <textarea
                      rows={3}
                      value={wordNotes[selectedWord.strong] ?? ""}
                      onChange={(e) => saveWordNote(selectedWord.strong!, e.target.value)}
                      placeholder="Observações sobre essa palavra em toda a Escritura..."
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-secondary)] leading-relaxed focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                )}

                <p className="text-[10px] text-[var(--text-dim)] pt-2 border-t border-[var(--border)]">
                  Fonte lexical: STEPBible-Data (CC BY 4.0), com base no BDB (hebraico) e no léxico de
                  Abbott-Smith (grego). O selo <span className="font-bold">EN</span> indica que essa glosa
                  específica ainda não está no dicionário de tradução (~88% de cobertura) e aparece no
                  original em inglês, em vez de uma mistura de idiomas. A definição completa permanece em
                  inglês, como na fonte.
                </p>
              </div>
            )}

            {wordTab === "ocorrencias" && (
              <div className="space-y-1.5">
                {occurrences === null && <p className="text-xs text-[var(--text-muted)]">Carregando ocorrências...</p>}
                {occurrences !== null && occurrences.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">Nenhuma outra ocorrência encontrada.</p>
                )}
                {occurrences?.map((o, i) => {
                  const ptText = bibleData.books[o.b]?.chapterData[String(o.c)]?.[String(o.v)];
                  return (
                    <button
                      key={i}
                      onClick={() => navigateToVerse(o.b, o.c, o.v)}
                      className="w-full text-left px-2 py-2 rounded hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border)]/50 last:border-0"
                    >
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{refLabel(o)}</span>
                        <span className="font-serif text-[var(--text)]">{o.o}</span>
                      </div>
                      {ptText && (
                        <p className="text-[10px] text-[var(--text-dim)] mt-0.5 line-clamp-1">{ptText}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </>
  );
  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--bg)]">
      {/* PAINEL DE VERSÍCULOS */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-[var(--text)]">
              {selectedBook} {selectedChapter}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Idioma original: <span className="font-semibold text-[var(--accent)]">{currentLanguage}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onListenFrom(Number(Object.keys(currentChapterVerses)[0] ?? 1))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                audioVerse !== null
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/60"
                  : "bg-[var(--accent)] text-white border-[var(--accent)] hover:bg-[var(--accent-hover)]"
              }`}
            >
              <HeadphonesIcon /> {audioVerse !== null ? "Ouvindo" : "Ouvir capítulo"}
            </button>
            <button
              onClick={() => setActiveSidePanel(activeSidePanel === "context" ? "none" : "context")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeSidePanel === "context"
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50"
              }`}
            >
              Contexto do Livro
            </button>
          </div>
        </div>

        {/* LISTA DE VERSÍCULOS */}
        <div className="space-y-3">
          {Object.entries(currentChapterVerses).map(([vNumStr, vText]) => {
            const vNum = parseInt(vNumStr);
            const verseKey = `${selectedBook}-${selectedChapter}-${vNum}`;
            const isExpanded = expandedVerse === vNum;
            const isNarrating = audioVerse === vNum;
            const vNote = userData[verseKey];
            const highlightClass = vNote?.highlightColor
              ? {
                  yellow: "bg-[var(--highlight-bg)] border-[var(--highlight-border)]",
                  green: "bg-[var(--highlight-green-bg)] border-[var(--highlight-green-border)]",
                  red: "bg-[var(--highlight-red-bg)] border-[var(--highlight-red-border)]",
                  blue: "bg-[var(--highlight-blue-bg)] border-[var(--highlight-blue-border)]",
                }[vNote.highlightColor]
              : "";
            const colorSwatch: Record<HighlightColor, string> = {
              yellow: "#E0B94D",
              green: "#2F6B45",
              red: "#8A2F2A",
              blue: "#2A6B8A",
            };

            return (
              <div
                key={vNum}
                ref={(el) => {
                  verseRefs.current[vNum] = el;
                }}
                onClick={() => {
                  const next = isExpanded ? null : vNum;
                  setExpandedVerse(next);
                  if (next) {
                    setSelectedVerse(next);
                  } else {
                    setActiveSidePanel("none");
                  }
                }}
                className={`p-4 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                  isExpanded
                    ? "border-[var(--accent)]/60 bg-[var(--bg-elevated)]/80 shadow-[0_0_0_1px_rgba(10,132,255,0.15)]"
                    : "border-[var(--bg-elevated-2)] bg-[var(--bg-elevated)]/60 hover:border-[var(--border)]"
                } ${highlightClass} ${isNarrating ? "ring-2 ring-[var(--accent)] shadow-[0_0_24px_-6px_var(--accent)]" : ""}`}
              >
                <div className="flex items-start gap-3 mb-1">
                  <span className="font-bold text-xs text-white bg-[var(--accent)] px-2 py-0.5 rounded-md shrink-0">
                    {vNum}
                  </span>
                  <div className="flex-1 min-w-0">{renderVerseContent(verseKey, vText, isExpanded)}</div>
                </div>

                {isExpanded && (
                  <div
                    className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onListenFrom(vNum)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium bg-[var(--bg-elevated-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/60"
                      title="Ouvir a partir deste versículo"
                    >
                      <HeadphonesIcon /> Ouvir daqui
                    </button>
                    <button
                      onClick={() => toggleFavorite(vNum)}
                      className={`p-1.5 rounded border ${
                        vNote?.favorite ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)]"
                      }`}
                      title="Favoritar"
                    >
                      <StarIcon filled={vNote?.favorite} />
                    </button>

                    <div className="flex items-center gap-1 px-1.5 py-1 rounded border border-[var(--border)]">
                      {(Object.keys(colorSwatch) as HighlightColor[]).map((color) => (
                        <button
                          key={color}
                          onClick={() => setHighlight(vNum, color)}
                          title={`Destacar em ${color}`}
                          className={`w-4 h-4 rounded-full border-2 transition-transform ${
                            vNote?.highlightColor === color ? "scale-110 border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: colorSwatch[color] }}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setActiveSidePanel(activeSidePanel === "study" ? "none" : "study")}
                      className={`text-xs px-2.5 py-1 rounded font-medium ${
                        activeSidePanel === "study"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                      }`}
                    >
                      Estudar
                    </button>
                    <button
                      onClick={() => setActiveSidePanel(activeSidePanel === "commentary" ? "none" : "commentary")}
                      className={`text-xs px-2.5 py-1 rounded font-medium ${
                        activeSidePanel === "commentary"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                      }`}
                    >
                      Comentário
                    </button>
                    <button
                      onClick={() => setActiveSidePanel(activeSidePanel === "references" ? "none" : "references")}
                      className={`text-xs px-2.5 py-1 rounded font-medium ${
                        activeSidePanel === "references"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                      }`}
                    >
                      Referências
                    </button>
                  </div>
                )}

                {vNote?.study && (
                  <div className="mt-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] italic bg-[var(--bg-elevated)] p-2 rounded">
                    <strong className="text-[var(--accent)] not-italic">Anotação de estudo:</strong>{" "}
                    {studyBlocksToPlainText(parseStudyBlocks(vNote.study))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* PAINEL LATERAL DE DETALHES / ANÁLISE — painel fixo no desktop (contexto/estudo/referências),
          popup central estilo liquid glass pra palavra (desktop e celular), tela cheia deslizante no
          celular pros demais. */}
      {activeSidePanel !== "none" && (
        <>
          {/* Fundo escurecido/desfocado — sempre visível pro popup de palavra, só no celular pros demais */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 ${activeSidePanel === "word" ? "" : "md:hidden"}`}
            onClick={() => setActiveSidePanel("none")}
          />
          <aside
            className={
              activeSidePanel === "word"
                ? "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                : "fixed md:static inset-x-0 bottom-0 md:inset-auto top-16 md:top-auto z-50 md:z-auto w-full md:w-80 lg:w-96 max-h-[85vh] md:max-h-none border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-panel)]/80 backdrop-blur-2xl p-4 pb-8 md:pb-4 overflow-y-auto shrink-0 rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none"
            }
          >
            {activeSidePanel === "word" ? (
              <div className="pointer-events-auto w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-[var(--bg-panel)]/75 backdrop-blur-2xl shadow-2xl p-4">
                {renderPanelInner()}
              </div>
            ) : (
              <>
                <div className="md:hidden w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3" />
                {renderPanelInner()}
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
