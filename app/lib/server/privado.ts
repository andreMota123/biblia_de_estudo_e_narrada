// Acesso ao conteúdo privado (Biblioteca pessoal e comentários de uso pessoal).
//
// Esses arquivos NÃO ficam em public/ nem no git: moram em PRIVADO_DIR (na VPS,
// um volume só-leitura) e só saem por rotas que conferem um "passe" — um cookie
// httpOnly assinado com BIBLIA_SEGREDO, emitido por /api/privado/sessao depois
// de validar o login do Supabase. O cookie vai sozinho em fetch e em <audio>,
// o que um cabeçalho Authorization não conseguiria.

import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import type { NextRequest } from "next/server";

export const COOKIE_PASSE = "biblia_passe";
export const DURACAO_PASSE_S = 60 * 60 * 24 * 30; // 30 dias

export const PRIVADO_DIR = process.env.PRIVADO_DIR || path.join(process.cwd(), "privado");

const SEGREDO = process.env.BIBLIA_SEGREDO || "";
const SUPABASE_CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function assinatura(dados: string): string {
  return createHmac("sha256", SEGREDO).update(dados).digest("base64url");
}

export function criarPasse(usuarioId: string): string {
  const dados = Buffer.from(JSON.stringify({ u: usuarioId, exp: Date.now() + DURACAO_PASSE_S * 1000 })).toString("base64url");
  return `${dados}.${assinatura(dados)}`;
}

function passeValido(valor: string | undefined): boolean {
  if (!valor || !SEGREDO) return false;
  const [dados, sig] = valor.split(".");
  if (!dados || !sig) return false;
  const esperado = Buffer.from(assinatura(dados));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(dados, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// No computador de desenvolvimento, sem Supabase (modo local), não há login:
// libera. Em produção o Supabase está sempre configurado e o passe é exigido.
export function autorizado(req: NextRequest): boolean {
  if (!SUPABASE_CONFIGURADO && process.env.NODE_ENV !== "production") return true;
  return passeValido(req.cookies.get(COOKIE_PASSE)?.value);
}

// Nome de arquivo seguro dentro de uma pasta (sem "..", sem barras).
export function arquivoDentro(pasta: string, nome: string): string | null {
  if (!nome || /[/\\]|\.\./.test(nome)) return null;
  const alvo = path.join(pasta, nome);
  return path.dirname(alvo) === pasta ? alvo : null;
}
