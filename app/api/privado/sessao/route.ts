import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COOKIE_PASSE, DURACAO_PASSE_S, criarPasse } from "@/app/lib/server/privado";

// Troca o login do Supabase (token enviado pelo app) por um passe em cookie
// httpOnly, usado pelas rotas de conteúdo privado. DELETE apaga o passe (sair).

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon || !process.env.BIBLIA_SEGREDO) {
    return NextResponse.json({ error: "Sem login" }, { status: 401 });
  }
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Login inválido" }, { status: 401 });
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(COOKIE_PASSE, criarPasse(data.user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_PASSE_S,
  });
  return res;
}

export async function DELETE() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(COOKIE_PASSE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
