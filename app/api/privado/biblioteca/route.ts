import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { PRIVADO_DIR, arquivoDentro, autorizado } from "@/app/lib/server/privado";

// Biblioteca pessoal. Sem "id": lista os livros (título e capítulos, sem o
// texto). Com "id": o livro inteiro.

const PASTA = path.join(PRIVADO_DIR, "biblioteca");

type Livro = { id: string; titulo: string; subtitulo?: string; autor?: string; fonte?: string; capitulos: { titulo: string; parte?: string | null }[] };

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Entre com seu login" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  const cab = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" };

  if (id) {
    const arquivo = arquivoDentro(PASTA, `${id}.json`);
    if (!arquivo) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    try {
      return new NextResponse(await fs.readFile(arquivo, "utf8"), { headers: cab });
    } catch {
      return NextResponse.json({ error: "Livro não encontrado" }, { status: 404 });
    }
  }

  let nomes: string[] = [];
  try {
    nomes = (await fs.readdir(PASTA)).filter((n) => n.endsWith(".json"));
  } catch {
    // sem biblioteca: lista vazia
  }
  const livros = await Promise.all(
    nomes.map(async (n) => {
      const l = JSON.parse(await fs.readFile(path.join(PASTA, n), "utf8")) as Livro;
      return {
        id: l.id,
        titulo: l.titulo,
        subtitulo: l.subtitulo,
        autor: l.autor,
        fonte: l.fonte,
        capitulos: l.capitulos.map((c) => ({ titulo: c.titulo, parte: c.parte ?? null })),
      };
    })
  );
  livros.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
  return NextResponse.json({ livros }, { headers: { "Cache-Control": "private, no-store" } });
}
