// Fontes e tamanho da letra da leitura, escolhidos pelo leitor (botão "Aa"
// da tela de leitura) e guardados no navegador. As fontes do Google são
// carregadas em app/layout.tsx via next/font (baixadas no build e servidas
// pelo próprio app) e expostas como variáveis CSS.

export type ReadingFontId = "padrao" | "literata" | "merriweather" | "lora" | "garamond" | "atkinson" | "sistema";

export type ReadingSettings = { fontSize: number; font: ReadingFontId };

export const READING_FONTS: { id: ReadingFontId; label: string; family: string; hint: string }[] = [
  { id: "padrao", label: "Padrão", family: 'ui-serif, Georgia, Cambria, "Times New Roman", serif', hint: "serifada do sistema" },
  { id: "literata", label: "Literata", family: "var(--font-literata), Georgia, serif", hint: "feita para livros digitais" },
  { id: "merriweather", label: "Merriweather", family: "var(--font-merriweather), Georgia, serif", hint: "encorpada, ótima em tela" },
  { id: "lora", label: "Lora", family: "var(--font-lora), Georgia, serif", hint: "clássica e suave" },
  { id: "garamond", label: "EB Garamond", family: "var(--font-garamond), Garamond, Georgia, serif", hint: "estilo das Bíblias impressas" },
  { id: "atkinson", label: "Atkinson Hyperlegible", family: "var(--font-atkinson), Verdana, sans-serif", hint: "máxima legibilidade" },
  { id: "sistema", label: "Sem serifa", family: "var(--font-sans)", hint: "a do celular/computador" },
];

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 30;
export const DEFAULT_READING: ReadingSettings = { fontSize: 16, font: "padrao" };

const KEY = "biblia-origens-leitura";

export function loadReadingSettings(): ReadingSettings {
  if (typeof window === "undefined") return DEFAULT_READING;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<ReadingSettings>;
    const font = READING_FONTS.some((f) => f.id === saved.font) ? saved.font! : DEFAULT_READING.font;
    const size = Number(saved.fontSize);
    const fontSize = Number.isFinite(size) ? Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size)) : DEFAULT_READING.fontSize;
    return { font, fontSize };
  } catch {
    return DEFAULT_READING;
  }
}

export function saveReadingSettings(s: ReadingSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // sem armazenamento: vale só nesta visita
  }
}

export function fontFamilyOf(id: ReadingFontId): string {
  return READING_FONTS.find((f) => f.id === id)?.family ?? READING_FONTS[0].family;
}
