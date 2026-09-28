import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// O cache de traduções é fechado para o navegador (RLS sem política). Só esta
// rota, que roda no servidor, grava e lê, com a chave service_role — que
// nunca vai para o código do navegador (não tem prefixo NEXT_PUBLIC_).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
  { auth: { persistSession: false } }
);

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  book: string;
  chapter: number;
  s: number;
  e: number;
  text: string;
};

const SYSTEM_PROMPT = `Você é um tradutor especializado em literatura teológica clássica em inglês do século XVII-XVIII.

Tarefa: traduzir para português (Brasil) um trecho do comentário bíblico de Matthew Henry (1662-1714), obra de domínio público.

Regras obrigatórias:
1. Traduza o texto INTEIRO, do início ao fim. Nunca resuma, condense, pule frases ou parágrafos.
2. Preserve toda a estrutura do original: numerais romanos (I., II., III.), números (1., 2., 3.), letras entre parênteses ((1.), (2.)), colchetes ([1.], [2.]) e qualquer outra marcação de tópicos.
3. Converta as referências bíblicas para a abreviação padrão em português: Gen->Gn, Exo->Êx, Lev->Lv, Num->Nm, Deu->Dt, Jos->Js, Jdg->Jz, Rut->Rt, Sa1->1Sm, Sa2->2Sm, Kg1->1Rs, Kg2->2Rs, Ch1->1Cr, Ch2->2Cr, Ezr->Ed, Neh->Ne, Est->Et, Job->Jó, Psa->Sl, Pro->Pv, Ecc->Ec, Sng->Ct, Isa->Is, Jer->Jr, Lam->Lm, Eze->Ez, Dan->Dn, Hos->Os, Joe->Jl, Amo->Am, Oba->Ob, Jon->Jn (contexto AT), Mic->Mq, Nah->Na, Hab->Hc, Zep->Sf, Hag->Ag, Zec->Zc, Mal->Ml, Mat->Mt, Mar->Mc, Luk->Lc, Joh->Jo (contexto NT), Act->At, Rom->Rm, Co1->1Co, Co2->2Co, Gal->Gl, Eph->Ef, Phi->Fp, Col->Cl, Th1->1Ts, Th2->2Ts, Ti1->1Tm, Ti2->2Tm, Tit->Tt, Phm->Fm, Heb->Hb, Jam->Tg, Pe1->1Pe, Pe2->2Pe, Jo1->1Jo, Jo2->2Jo, Jo3->3Jo, Jde->Jd, Rev->Ap. Formato: "Livro capítulo.versículo" (ex: "Rm 8.30"), intervalos com hífen (ex: "Rm 8.30-32").
4. Traduza citações bíblicas embutidas no texto para uma redação em português natural e teologicamente precisa (não precisa ser uma versão específica registrada, mas fiel ao sentido do inglês).
5. Mantenha o registro formal e teológico do original — é um comentário exegético do século XVIII, não um texto coloquial moderno.
6. Se o texto de entrada terminar de forma abrupta (no meio de uma frase ou palavra), isso é um defeito da fonte original: traduza até onde o texto realmente vai e pare exatamente aí, sem completar ou inventar o final.
7. Nunca acrescente comentários, notas de tradução, ou qualquer texto que não seja a tradução em si.

Responda APENAS com o texto traduzido, sem preâmbulo, sem aspas envolvendo tudo, sem repetir o texto original.`;

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { book, chapter, s, e, text } = body;
  if (!book || !chapter || !s || !e || !text) {
    return NextResponse.json({ error: "Parâmetros faltando" }, { status: 400 });
  }

  // 1. Verifica o cache primeiro — evita gastar tokens numa tradução que
  // outra sessão (ou este mesmo usuário, antes) já pediu.
  const { data: cached, error: cacheError } = await supabase
    .from("biblia_commentary_translations")
    .select("text_pt, truncated")
    .eq("book", book)
    .eq("chapter", chapter)
    .eq("verse_start", s)
    .maybeSingle();

  if (cacheError) {
    console.error("Erro ao consultar cache de tradução:", cacheError.message);
  }
  if (cached) {
    return NextResponse.json({ text_pt: cached.text_pt, truncated: cached.truncated, fromCache: true });
  }

  // 2. Não está em cache: chama a API da Anthropic pra traduzir agora.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_TRANSLATE_MODEL || "claude-sonnet-5",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Traduza este trecho do comentário de Matthew Henry sobre ${book} ${chapter}:${s}${e !== s ? `-${e}` : ""}:\n\n${text}`,
          },
        ],
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao contatar a API da Anthropic: " + (err instanceof Error ? err.message : String(err)) },
      { status: 502 }
    );
  }

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.text();
    return NextResponse.json(
      { error: `API da Anthropic retornou ${anthropicRes.status}: ${errBody}` },
      { status: 502 }
    );
  }

  const data = await anthropicRes.json();
  const textPt: string | undefined = data.content?.find((c: { type: string }) => c.type === "text")?.text;
  const truncated = data.stop_reason === "max_tokens";

  if (!textPt) {
    return NextResponse.json({ error: "Resposta da Anthropic sem texto traduzido." }, { status: 502 });
  }

  // 3. Salva no cache pra próxima vez (qualquer usuário) vir instantâneo.
  const { error: insertError } = await supabase.from("biblia_commentary_translations").insert({
    book,
    chapter,
    verse_start: s,
    verse_end: e,
    text_pt: textPt,
    truncated,
  });
  if (insertError) {
    console.error("Erro ao salvar tradução no cache:", insertError.message);
  }

  return NextResponse.json({ text_pt: textPt, truncated, fromCache: false });
}
