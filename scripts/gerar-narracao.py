#!/usr/bin/env python3
"""
Gera a narração em áudio (voz neural) dos capítulos da Bíblia Livre.

Para cada capítulo produz:
  public/narracao/<voz>/<Livro>/<capitulo>.mp3   — áudio do capítulo inteiro
  public/narracao/<voz>/<Livro>/<capitulo>.json  — início/fim de cada versículo
                                                  (em segundos), usado pelo app
                                                  para destacar o versículo
                                                  que está sendo narrado.

Cada versículo é narrado separadamente e os trechos são unidos com uma pausa
curta entre eles, como um leitor humano faria. Os tempos saem exatos porque
são calculados a partir das próprias amostras de áudio, não estimados.

Uso (dentro de um venv com `pip install edge-tts`, e ffmpeg instalado):
  python scripts/gerar-narracao.py Salmos 23
  python scripts/gerar-narracao.py João            # livro inteiro
  python scripts/gerar-narracao.py --tudo          # Bíblia inteira (~70 h de áudio)
  python scripts/gerar-narracao.py João 3 --voz pt-BR-FranciscaNeural --velocidade -5%
"""

import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
BIBLE = json.loads((ROOT / "data" / "bible" / "bible.json").read_text(encoding="utf-8"))["books"]
OUT_ROOT = ROOT / "public" / "narracao"

SAMPLE_RATE = 24000  # taxa nativa das vozes neurais
BYTES_PER_SECOND = SAMPLE_RATE * 2  # PCM 16 bits mono
PAUSA_VERSICULO = 0.55  # segundos de silêncio entre versículos
PAUSA_TITULO = 0.9  # depois de "Salmos, capítulo 23."

MASCULINOS = {"Samuel", "Reis", "Crônicas"}


def nome_falado(livro: str) -> str:
    m = re.match(r"^([123])\s+(.+)$", livro)
    if not m:
        return livro
    ordinais = ["Primeiro", "Segundo", "Terceiro"] if m.group(2) in MASCULINOS else ["Primeira", "Segunda", "Terceira"]
    return f"{ordinais[int(m.group(1)) - 1]} {m.group(2)}"


def normalizar(texto: str) -> str:
    # "SENHOR" -> "Senhor": algumas vozes leem palavras em caixa alta como sigla.
    texto = re.sub(r"(?<![^\W\d_])([^\W\d_])([^\W\d_]+)(?![^\W\d_])",
                   lambda m: m.group(0) if not m.group(0).isupper() else m.group(1) + m.group(2).lower(),
                   texto)
    return re.sub(r"\s+", " ", texto).strip()


async def sintetizar(texto: str, voz: str, velocidade: str, sem: asyncio.Semaphore) -> bytes:
    """Narra um trecho e devolve PCM 16 bits mono 24 kHz."""
    async with sem:
        for tentativa in range(4):
            try:
                mp3 = bytearray()
                async for chunk in edge_tts.Communicate(texto, voz, rate=velocidade).stream():
                    if chunk["type"] == "audio":
                        mp3.extend(chunk["data"])
                if mp3:
                    break
            except Exception as erro:  # rede instável: tenta de novo
                if tentativa == 3:
                    raise
                print(f"    tentando de novo ({erro})", file=sys.stderr)
                await asyncio.sleep(2 * (tentativa + 1))
    proc = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "pipe:1"],
        input=bytes(mp3), capture_output=True, check=True,
    )
    return proc.stdout


def silencio(segundos: float) -> bytes:
    n = int(segundos * SAMPLE_RATE)
    return b"\x00\x00" * n


async def gerar_capitulo(livro: str, capitulo: int, voz: str, velocidade: str, sem: asyncio.Semaphore, refazer: bool):
    destino = OUT_ROOT / voz / livro
    mp3_path = destino / f"{capitulo}.mp3"
    json_path = destino / f"{capitulo}.json"
    if mp3_path.exists() and json_path.exists() and not refazer:
        return

    versiculos = BIBLE[livro]["chapterData"][str(capitulo)]
    numeros = sorted(versiculos, key=int)
    titulo = f"{nome_falado(livro)}, capítulo {capitulo}."

    trechos = await asyncio.gather(
        sintetizar(titulo, voz, velocidade, sem),
        *(sintetizar(normalizar(versiculos[n]), voz, velocidade, sem) for n in numeros),
    )

    pcm = bytearray(trechos[0])
    pcm.extend(silencio(PAUSA_TITULO))
    tempos = []
    for n, audio in zip(numeros, trechos[1:]):
        inicio = len(pcm) / BYTES_PER_SECOND
        pcm.extend(audio)
        tempos.append({"v": int(n), "s": round(inicio, 3), "e": round(len(pcm) / BYTES_PER_SECOND, 3)})
        pcm.extend(silencio(PAUSA_VERSICULO))

    destino.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-b:a", "64k", str(mp3_path)],
        input=bytes(pcm), check=True,
    )
    json_path.write_text(
        json.dumps({"voz": voz, "duracao": round(len(pcm) / BYTES_PER_SECOND, 3), "versiculos": tempos}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"  {livro} {capitulo}: {len(numeros)} versículos, {len(pcm) / BYTES_PER_SECOND / 60:.1f} min")


async def main():
    p = argparse.ArgumentParser(description="Gera narração neural da Bíblia Livre.")
    p.add_argument("livro", nargs="?")
    p.add_argument("capitulos", nargs="*", type=int)
    p.add_argument("--tudo", action="store_true", help="gera a Bíblia inteira")
    p.add_argument("--voz", default="pt-BR-AntonioNeural")
    p.add_argument("--velocidade", default="-6%", help="ex.: -10%%, +0%%, +10%%")
    p.add_argument("--paralelo", type=int, default=16, help="falas sintetizadas ao mesmo tempo")
    p.add_argument("--capitulos-paralelos", type=int, default=6)
    p.add_argument("--refazer", action="store_true", help="regera capítulos que já existem")
    args = p.parse_args()

    if args.tudo:
        alvos = [(l, c) for l in BIBLE for c in range(1, BIBLE[l]["chapters"] + 1)]
    elif args.livro:
        if args.livro not in BIBLE:
            sys.exit(f"Livro não encontrado: {args.livro}. Use o nome como no app (ex.: 'Gênesis', '1 Samuel').")
        caps = args.capitulos or range(1, BIBLE[args.livro]["chapters"] + 1)
        alvos = [(args.livro, c) for c in caps]
    else:
        p.error("informe um livro ou --tudo")

    # Vários capítulos ao mesmo tempo: cada requisição à voz demora alguns
    # segundos, então paralelizar só dentro do capítulo deixa a rede ociosa.
    sem = asyncio.Semaphore(args.paralelo)
    sem_capitulos = asyncio.Semaphore(args.capitulos_paralelos)

    async def um_capitulo(livro: str, cap: int):
        async with sem_capitulos:
            try:
                await gerar_capitulo(livro, cap, args.voz, args.velocidade, sem, args.refazer)
            except Exception as erro:
                # Um capítulo com falha não derruba o resto; rodar de novo o
                # script completa só os que faltam.
                print(f"  FALHOU {livro} {cap}: {erro}", file=sys.stderr)

    await asyncio.gather(*(um_capitulo(livro, cap) for livro, cap in alvos))


if __name__ == "__main__":
    asyncio.run(main())
