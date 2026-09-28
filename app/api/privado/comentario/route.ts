import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";

import { PRIVADO_DIR, arquivoDentro, autorizado } from "@/app/lib/server/privado";

// Comentários de uso pessoal, por livro: /api/privado/comentario?fonte=comentario-pentecostal&livro=Mateus

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Entre com seu login" }, { status: 401 });
  const fonte = req.nextUrl.searchParams.get("fonte") ?? "";
  const livro = req.nextUrl.searchParams.get("livro") ?? "";
  const pasta = arquivoDentro(PRIVADO_DIR, fonte);
  const arquivo = pasta ? arquivoDentro(pasta, `${livro}.json`) : null;
  if (!arquivo) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  try {
    const dados = await fs.readFile(arquivo, "utf8");
    return new NextResponse(dados, {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Este livro não tem este comentário" }, { status: 404 });
  }
}

