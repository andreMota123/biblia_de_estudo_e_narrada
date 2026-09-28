// --- TIPAGENS COMPARTILHADAS DO APP BÍBLIA ORIGENS ---

export type InterlinearWord = {
  translation: string;
  original: string;
  translit: string;
  strong?: string;
  grammar?: string;
  meaning?: string;
  morphology?: string;
  isJesusWords?: boolean;
};

export type BibleBook = {
  name: string;
  testament: string;
  category: string;
  chapters: number;
  chapterData: Record<string, Record<string, string>>;
};

export type BibleData = {
  books: Record<string, BibleBook>;
};

export type HighlightColor = "yellow" | "green" | "red" | "blue";

export type VerseNote = {
  favorite: boolean;
  highlightColor: HighlightColor | null;
  note: string;
  study?: string;
};

export type UserData = Record<string, VerseNote>;

export type User = {
  id: string;
  name: string;
  email: string;
};

export type SearchResult = {
  bookKey: string;
  bookName: string;
  chapter: string;
  verse: string;
  text: string;
};

export type ContextInfo = {
  author?: string;
  date?: string;
  theme?: string;
  keywords?: string[];
  introduction?: string;
  historicalContext?: string;
  summary?: string;
};


export type ActiveTab = "home" | "read" | "studies" | "search" | "favorites" | "highlights" | "wordnotes" | "library";

export type ActiveSidePanel = "none" | "context" | "study" | "references" | "word" | "commentary";

export type ReferenceItem = { passage: string; text: string };

export type SavedStudy = {
  key: string;
  book: string;
  chapter: number;
  verse: number;
  study: string | undefined;
  verseText: string;
};
