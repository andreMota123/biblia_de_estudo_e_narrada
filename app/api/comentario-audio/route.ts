import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { commentaryToSpeech } from "@/app/lib/commentarySpeech";

// Narração do comentário de Matthew Henry, gerada sob demanda.
//
// Na primeira vez que alguém pede um bloco, o texto traduzido é narrado com a
// mesma voz da Bíblia (edge-tts, instalado na imagem Docker) e o MP3 fica
// guardado em COMENTARIO_AUDIO_DIR; dali em diante é só servir o arquivo.
// Responde a pedidos com Range, que o Safari do iPhone exige para tocar.

export const runtime = "nodejs";
export const maxDuration = 300;

const PASTA_COMENTARIO = path.join(process.cwd(), "public", "commentary", "matthew-henry");
const PASTA_AUDIO = process.env.COMENTARIO_AUDIO_DIR || path.join(process.cwd(), ".cache", "comentario-audio");
const EDGE_TTS = process.env.EDGE_TTS_BIN || "edge-tts";
const VOZ = process.env.NARRACAO_VOZ || "pt-BR-AntonioNeural";

type Bloco = { s: number; e: number; t: string; t_pt?: string };

// Evita narrar o mesmo bloco duas vezes quando chegam pedidos simultâneos
// (o navegador costuma pedir o mesmo áudio mais de uma vez ao começar).
const emAndamento = new Map<string, Promise<void>>();

async function textoDoBloco(livro: string, cap: number, s: number): Promise<string | null> {
  const arquivo = path.join(PASTA_COMENTARIO, `${livro}.json`);
  if (path.dirname(arquivo) !== PASTA_COMENTARIO) return null;
  try {
    const dados = JSON.parse(await fs.readFile(arquivo, "utf8")) as { chapters: Record<string, Bloco[]> };
    const bloco = dados.chapters[String(cap)]?.find((b) => b.s === s);
    return bloco?.t_pt ?? null;
  } catch {
    return null;
  }
}

// Divide o texto em pedaços de ~1.500 caracteres, respeitando parágrafos e
// frases, para narrar vários ao mesmo tempo.
function pedacos(texto: string, limite = 1500): string[] {
  const partes: string[] = [];
  let atual = "";
  const unidades = texto.split(/\n+/).flatMap((par) =>
    par.length <= limite ? [par] : par.match(/[^.!?;]+[.!?;]*\s*/g) ?? [par]
  );
  for (const u of unidades) {
    if (atual && atual.length + u.length + 1 > limite) {
      partes.push(atual);
      atual = u;
    } else {
      atual = atual ? `${atual}\n${u}` : u;
    }
  }
  if (atual.trim()) partes.push(atual);
  return partes;
}

function narrarPedaco(texto: string, base: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const txt = `${base}.txt`;
    const mp3 = `${base}.mp3`;
    fs.writeFile(txt, texto, "utf8")
      .then(() => {
        const proc = spawn(EDGE_TTS, ["--voice", VOZ, "--rate=-6%", "--file", txt, "--write-media", mp3]);
        let erro = "";
        proc.stderr.on("data", (d) => (erro += d.toString()));
        proc.on("error", reject);
        proc.on("close", async (codigo) => {
          try {
            if (codigo !== 0) throw new Error(`edge-tts saiu com ${codigo}: ${erro.slice(-300)}`);
            resolve(await fs.readFile(mp3));
          } catch (err) {
            reject(err);
          } finally {
            await fs.rm(txt, { force: true });
            await fs.rm(mp3, { force: true });
          }
        });
      })
      .catch(reject);
  });
}

// Narra os pedaços em paralelo (até 6 ao mesmo tempo) e emenda os MP3 na
// ordem — todos saem no mesmo formato, então os quadros podem ser unidos
// direto. Cada pedaço tem até 3 tentativas (a rede às vezes falha).
async function narrar(texto: string, destino: string): Promise<void> {
  const partes = pedacos(texto);
  const audios: Buffer[] = new Array(partes.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < partes.length) {
      const i = proximo++;
      for (let tentativa = 1; ; tentativa++) {
        try {
          audios[i] = await narrarPedaco(partes[i], `${destino}.${process.pid}.${i}`);
          break;
        } catch (err) {
          if (tentativa >= 3) throw err;
          await new Promise((r) => setTimeout(r, 1500 * tentativa));
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, partes.length) }, trabalhador));
  const tmp = `${destino}.${process.pid}.tmp`;
  await fs.writeFile(tmp, Buffer.concat(audios));
  await fs.rename(tmp, destino);
}

async function servir(req: NextRequest, arquivo: string) {
  const { size } = await fs.stat(arquivo);
  const cabecalhos = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  const faixa = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (faixa && (faixa[1] || faixa[2])) {
    const inicio = faixa[1] ? Number(faixa[1]) : Math.max(0, size - Number(faixa[2]));
    const fim = faixa[1] && faixa[2] ? Math.min(Number(faixa[2]), size - 1) : size - 1;
    if (inicio >= size || inicio > fim) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const corpo = Readable.toWeb(createReadStream(arquivo, { start: inicio, end: fim })) as ReadableStream;
    return new NextResponse(corpo, {
      status: 206,
      headers: { ...cabecalhos, "Content-Range": `bytes ${inicio}-${fim}/${size}`, "Content-Length": String(fim - inicio + 1) },
    });
  }
  const corpo = Readable.toWeb(createReadStream(arquivo)) as ReadableStream;
  return new NextResponse(corpo, { headers: { ...cabecalhos, "Content-Length": String(size) } });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const livro = p.get("livro") ?? "";
  const cap = Number(p.get("cap"));
  const s = Number(p.get("s"));
  if (!livro || /[/\\]|\.\./.test(livro) || !Number.isInteger(cap) || !Number.isInteger(s) || cap < 1 || s < 1) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const arquivo = path.join(PASTA_AUDIO, VOZ, livro, `${cap}-${s}.mp3`);
  const pronto = await fs.access(arquivo).then(() => true, () => false);

  if (!pronto) {
    const texto = await textoDoBloco(livro, cap, s);
    if (!texto) {
      return NextResponse.json({ error: "Este comentário ainda não foi traduzido." }, { status: 404 });
    }
    let tarefa = emAndamento.get(arquivo);
    if (!tarefa) {
      tarefa = fs
        .mkdir(path.dirname(arquivo), { recursive: true })
        .then(() => narrar(commentaryToSpeech(texto), arquivo))
        .finally(() => emAndamento.delete(arquivo));
      emAndamento.set(arquivo, tarefa);
    }
    try {
      await tarefa;
    } catch (err) {
      console.error("Falha ao narrar comentário:", err);
      return NextResponse.json({ error: "Não foi possível gerar o áudio agora. Tente de novo." }, { status: 502 });
    }
  }

  return servir(req, arquivo);
}
