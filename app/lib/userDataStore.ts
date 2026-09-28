import { supabase } from "./supabaseClient";
import type { HighlightColor, User, UserData, VerseNote } from "../types";

// --- Modo local (sem Supabase): tudo fica no localStorage deste navegador ---

export const LOCAL_USER: User = {
  id: "local",
  name: process.env.NEXT_PUBLIC_READER_NAME || "Leitor",
  email: "",
};

const LOCAL_VERSE_NOTES_KEY = "biblia-origens-notas-versiculos";
const LOCAL_WORD_NOTES_KEY = "biblia-origens-notas-palavras";

function readLocal<T extends object>(key: string): T {
  if (typeof window === "undefined") return {} as T;
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as T;
  } catch {
    return {} as T;
  }
}

function writeLocal(key: string, value: object) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Erro ao salvar no navegador:", err);
  }
}

export function loadLocalUserData(): UserData {
  return readLocal<UserData>(LOCAL_VERSE_NOTES_KEY);
}

export function loadLocalWordNotes(): Record<string, string> {
  return readLocal<Record<string, string>>(LOCAL_WORD_NOTES_KEY);
}

type VerseNoteRow = {
  verse_key: string;
  favorite: boolean;
  highlighted: boolean;
  highlight_color: HighlightColor | null;
  note: string;
  study: string;
};

// Busca todas as anotações do usuário logado e monta o UserData no formato
// que o resto do app já espera ("Livro-Cap-Vers" -> VerseNote).
export async function fetchUserData(userId: string): Promise<UserData> {
  if (userId === LOCAL_USER.id) return loadLocalUserData();

  const { data, error } = await supabase
    .from("biblia_verse_notes")
    .select("verse_key, favorite, highlighted, highlight_color, note, study")
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao carregar anotações do Supabase:", error.message);
    return {};
  }

  const result: UserData = {};
  for (const row of (data ?? []) as VerseNoteRow[]) {
    // Compatibilidade com destaques antigos (coluna boolean "highlighted"),
    // salvos antes de existir cor - tratados como amarelo.
    const highlightColor: HighlightColor | null =
      row.highlight_color ?? (row.highlighted ? "yellow" : null);
    result[row.verse_key] = {
      favorite: row.favorite,
      highlightColor,
      note: row.note,
      study: row.study,
    };
  }
  return result;
}

// Grava (upsert) a anotação de um único versículo. Se a nota ficou "vazia"
// (sem favorito, destaque, nota ou estudo), apaga a linha para não acumular
// lixo no banco.
export async function upsertVerseNote(
  userId: string,
  verseKey: string,
  note: VerseNote
): Promise<void> {
  const isEmpty =
    !note.favorite && !note.highlightColor && !note.note.trim() && !(note.study ?? "").trim();

  if (userId === LOCAL_USER.id) {
    const all = loadLocalUserData();
    if (isEmpty) delete all[verseKey];
    else all[verseKey] = note;
    writeLocal(LOCAL_VERSE_NOTES_KEY, all);
    return;
  }

  if (isEmpty) {
    const { error } = await supabase
      .from("biblia_verse_notes")
      .delete()
      .eq("user_id", userId)
      .eq("verse_key", verseKey);
    if (error) console.error("Erro ao remover anotação vazia:", error.message);
    return;
  }

  const { error } = await supabase.from("biblia_verse_notes").upsert({
    user_id: userId,
    verse_key: verseKey,
    favorite: note.favorite,
    highlighted: !!note.highlightColor,
    highlight_color: note.highlightColor,
    note: note.note,
    study: note.study ?? "",
  });

  if (error) console.error("Erro ao salvar anotação no Supabase:", error.message);
}

// --- Notas ligadas à palavra original (Strong's), não a um versículo ---

export async function fetchWordNotes(userId: string): Promise<Record<string, string>> {
  if (userId === LOCAL_USER.id) return loadLocalWordNotes();

  const { data, error } = await supabase.from("biblia_word_notes").select("strong, note").eq("user_id", userId);

  if (error) {
    console.error("Erro ao carregar notas de palavra do Supabase:", error.message);
    return {};
  }

  const result: Record<string, string> = {};
  for (const row of (data ?? []) as { strong: string; note: string }[]) {
    result[row.strong] = row.note;
  }
  return result;
}

export async function upsertWordNote(userId: string, strong: string, note: string): Promise<void> {
  if (userId === LOCAL_USER.id) {
    const all = loadLocalWordNotes();
    if (note.trim()) all[strong] = note;
    else delete all[strong];
    writeLocal(LOCAL_WORD_NOTES_KEY, all);
    return;
  }

  if (!note.trim()) {
    const { error } = await supabase.from("biblia_word_notes").delete().eq("user_id", userId).eq("strong", strong);
    if (error) console.error("Erro ao remover nota de palavra vazia:", error.message);
    return;
  }

  const { error } = await supabase.from("biblia_word_notes").upsert({ user_id: userId, strong, note });
  if (error) console.error("Erro ao salvar nota de palavra no Supabase:", error.message);
}
