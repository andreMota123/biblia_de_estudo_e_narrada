// Prepara o texto do comentário para ser lido em voz alta.
//
// O comentário cita muitas passagens na forma abreviada ("Rm 4.11",
// "1Cr 1.4-27"); lidas como estão, a voz diria "erre eme quatro ponto onze".
// Aqui viram "Romanos 4, 11" e "Primeiro Crônicas 1, 4 a 27". Os marcadores
// de tópico em algarismos romanos ("II.") viram ordinais falados.

const LIVROS: Record<string, string> = {
  Gn: "Gênesis", "Êx": "Êxodo", Lv: "Levítico", Nm: "Números", Dt: "Deuteronômio", Js: "Josué",
  Jz: "Juízes", Rt: "Rute", "1Sm": "Primeiro Samuel", "2Sm": "Segundo Samuel", "1Rs": "Primeiro Reis",
  "2Rs": "Segundo Reis", "1Cr": "Primeiro Crônicas", "2Cr": "Segundo Crônicas", Ed: "Esdras",
  Ne: "Neemias", Et: "Ester", "Jó": "Jó", Sl: "Salmos", Pv: "Provérbios", Ec: "Eclesiastes",
  Ct: "Cânticos", Is: "Isaías", Jr: "Jeremias", Lm: "Lamentações", Ez: "Ezequiel", Dn: "Daniel",
  Os: "Oseias", Jl: "Joel", Am: "Amós", Ob: "Obadias", Jn: "Jonas", Mq: "Miqueias", Na: "Naum",
  Hc: "Habacuque", Sf: "Sofonias", Ag: "Ageu", Zc: "Zacarias", Ml: "Malaquias", Mt: "Mateus",
  Mc: "Marcos", Lc: "Lucas", Jo: "João", At: "Atos", Rm: "Romanos", "1Co": "Primeira Coríntios",
  "2Co": "Segunda Coríntios", Gl: "Gálatas", Ef: "Efésios", Fp: "Filipenses", Cl: "Colossenses",
  "1Ts": "Primeira Tessalonicenses", "2Ts": "Segunda Tessalonicenses", "1Tm": "Primeira Timóteo",
  "2Tm": "Segunda Timóteo", Tt: "Tito", Fm: "Filemom", Hb: "Hebreus", Tg: "Tiago", "1Pe": "Primeira Pedro",
  "2Pe": "Segunda Pedro", "1Jo": "Primeira João", "2Jo": "Segunda João", "3Jo": "Terceira João",
  Jd: "Judas", Ap: "Apocalipse",
};

// Abreviações mais longas primeiro, para "1Jo" não virar "1" + "Jo".
const SIGLAS = Object.keys(LIVROS).sort((a, b) => b.length - a.length).join("|");
const RE_REF = new RegExp(`(?<![\\p{L}\\d])(${SIGLAS}) (\\d+)[.:](\\d+)(?:-(\\d+))?`, "gu");

const ORDINAIS = ["Primeiro", "Segundo", "Terceiro", "Quarto", "Quinto", "Sexto", "Sétimo", "Oitavo", "Nono", "Décimo"];
const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function commentaryToSpeech(texto: string): string {
  return texto
    .replace(RE_REF, (_, sigla: string, cap: string, vers: string, fim?: string) =>
      `${LIVROS[sigla]} ${cap}, ${vers}${fim ? ` a ${fim}` : ""}`
    )
    .replace(/^(\s*)(X|IX|VIII|VII|VI|V|IV|III|II|I)\.\s/gm, (_, esp: string, r: string) => `${esp}${ORDINAIS[ROMANOS.indexOf(r)]}: `)
    // "(1.)" e "[2.]" são numeração de subtópico: basta o número.
    .replace(/[([](\d+)\.[)\]]/g, "$1.")
    .replace(/(?<!\p{L})(\p{Lu})(\p{Lu}+)(?!\p{L})/gu, (_, a: string, b: string) => a + b.toLowerCase())
    .replace(/[ \t]+/g, " ")
    .trim();
}
