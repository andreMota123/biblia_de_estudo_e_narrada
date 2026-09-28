#!/usr/bin/env python3
"""
Traduz o comentário de Matthew Henry para o português com uma IA local
(Ollama, na placa de vídeo deste computador) — sem API paga.

Grava a tradução no próprio arquivo de cada livro, em
public/commentary/matthew-henry/<Livro>.json, nos campos que o app já lê:
  t_pt       — texto traduzido do bloco
  t_pt_auto  — true: tradução automática (o app mostra o aviso e o original)
  intro_pt   — introdução do livro

Pode ser interrompido e retomado a qualquer momento: bloco que já tem t_pt é
pulado. Cada bloco é salvo assim que termina.

Uso:
  python3 scripts/traduzir-comentario.py                 # todos, na ordem de prioridade
  python3 scripts/traduzir-comentario.py Romanos Salmos  # só esses livros
  python3 scripts/traduzir-comentario.py --modelo qwen3:14b --paralelo 4
"""

import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PASTA = ROOT / "public" / "commentary" / "matthew-henry"
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")

# Novo Testamento primeiro, depois Salmos e Provérbios, depois o resto do AT
# na ordem canônica.
NT = ["Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas",
      "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo",
      "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João",
      "3 João", "Judas", "Apocalipse"]
AT = ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel",
      "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó",
      "Salmos", "Provérbios", "Eclesiastes", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel",
      "Oséias", "Joel", "Amós", "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque", "Sofonias", "Ageu",
      "Zacarias", "Malaquias"]
PRIORIDADE = NT + ["Salmos", "Provérbios"] + [l for l in AT if l not in ("Salmos", "Provérbios")]

# Abreviações da fonte (inglês) -> padrão brasileiro. Convertidas por código
# ANTES da IA: nos testes, o modelo local trocava "Ch1 1:4" por "Gn 1.4".
ABREV = {
    "Gen": "Gn", "Exo": "Êx", "Lev": "Lv", "Num": "Nm", "Deu": "Dt", "Jos": "Js", "Jdg": "Jz", "Rut": "Rt",
    "Sa1": "1Sm", "Sa2": "2Sm", "Kg1": "1Rs", "Kg2": "2Rs", "Ch1": "1Cr", "Ch2": "2Cr", "Ezr": "Ed",
    "Neh": "Ne", "Est": "Et", "Job": "Jó", "Psa": "Sl", "Pro": "Pv", "Ecc": "Ec", "Sol": "Ct", "Sng": "Ct",
    "Isa": "Is", "Jer": "Jr", "Lam": "Lm", "Eze": "Ez", "Dan": "Dn", "Hos": "Os", "Joe": "Jl", "Amo": "Am",
    "Oba": "Ob", "Jon": "Jn", "Mic": "Mq", "Nah": "Na", "Hab": "Hc", "Zep": "Sf", "Hag": "Ag", "Zac": "Zc",
    "Zec": "Zc", "Mal": "Ml", "Mat": "Mt", "Mar": "Mc", "Luk": "Lc", "Joh": "Jo", "Act": "At", "Rom": "Rm",
    "Co1": "1Co", "Co2": "2Co", "Gal": "Gl", "Eph": "Ef", "Phi": "Fp", "Col": "Cl", "Th1": "1Ts",
    "Th2": "2Ts", "Ti1": "1Tm", "Ti2": "2Tm", "Tit": "Tt", "Plm": "Fm", "Phm": "Fm", "Heb": "Hb",
    "Jam": "Tg", "Pe1": "1Pe", "Pe2": "2Pe", "Jo1": "1Jo", "Jo2": "2Jo", "Jo3": "3Jo", "Jde": "Jd",
    "Rev": "Ap",
}
RE_REF = re.compile(r"\b(" + "|".join(ABREV) + r") (\d+):(\d+(?:-\d+)?)")
RE_REF_PT = re.compile(r"\b[1-3]?[A-ZÊÓ][a-zó]? ?\d+\.\d+")


def converter_referencias(texto: str) -> str:
    return RE_REF.sub(lambda m: f"{ABREV[m.group(1)]} {m.group(2)}.{m.group(3)}", texto)


SISTEMA = """Você é tradutor de literatura teológica clássica. Traduza para o português do Brasil o trecho do comentário bíblico de Matthew Henry (1662-1714) que o usuário enviar.

Regras:
- Traduza tudo, frase por frase: não resuma, não omita e não acrescente nada.
- Mantenha os parágrafos e os marcadores de tópico exatamente como estão (I., II., 1., 2., (1.), [1.]).
- As referências bíblicas já estão no padrão brasileiro (ex.: Rm 4.11, 1Cr 1.4, Lc 3.34-38): copie-as exatamente como estão.
- Use o vocabulário teológico tradicional em português: aliança, graça, justificação, santificação, pecado, versículo, Senhor.
- Nomes bíblicos na forma usual das Bíblias em português (Sem, Jafé, Abraão, Moisés, Jessé).
- Registro formal e reverente, como o original.
- Se o texto terminar no meio de uma frase, pare exatamente aí, sem completar.
- Responda apenas com a tradução, sem introdução, título ou comentário seu."""

PREFIXOS_LIXO = re.compile(r"^\s*(aqui está a tradução[^\n]*:|tradução:)\s*", re.IGNORECASE)


def pedaços(texto: str, limite: int = 2400) -> list[str]:
    """Divide o bloco em partes de até ~limite caracteres, respeitando parágrafos
    (e, se um parágrafo for enorme, frases)."""
    partes: list[str] = []
    atual = ""

    def juntar(unidade: str, sep: str):
        nonlocal atual
        if atual and len(atual) + len(sep) + len(unidade) > limite:
            partes.append(atual)
            atual = unidade
        else:
            atual = atual + sep + unidade if atual else unidade

    for par in texto.split("\n"):
        if len(par) <= limite:
            juntar(par, "\n")
            continue
        for i, frase in enumerate(re.findall(r"[^.!?;]+[.!?;]*\s*", par) or [par]):
            juntar(frase, "\n" if i == 0 else "")
    if atual.strip():
        partes.append(atual)
    return partes


def chamar(modelo: str, texto: str, temperatura: float) -> str:
    corpo = {
        "model": modelo, "stream": False, "think": False,
        "options": {"temperature": temperatura, "num_ctx": 8192},
        "messages": [{"role": "system", "content": SISTEMA}, {"role": "user", "content": texto}],
    }
    req = urllib.request.Request(f"{OLLAMA}/api/chat", json.dumps(corpo).encode(), {"Content-Type": "application/json"})
    for tentativa in range(5):
        try:
            with urllib.request.urlopen(req, timeout=900) as r:
                return PREFIXOS_LIXO.sub("", json.load(r)["message"]["content"]).strip()
        except Exception as erro:
            if tentativa == 4:
                raise
            print(f"    Ollama falhou ({erro}); tentando de novo", file=sys.stderr, flush=True)
            time.sleep(10 * (tentativa + 1))
    return ""


def traduzir_pedaço(modelo: str, original: str) -> tuple[str, bool]:
    """Traduz e confere: tamanho plausível e referências preservadas.
    Devolve (tradução, passou_na_conferência)."""
    refs = sorted(RE_REF_PT.findall(original))
    melhor = ""
    for temperatura in (0.2, 0.5):
        pt = chamar(modelo, original, temperatura)
        razão = len(pt) / max(1, len(original))
        refs_ok = all(pt.count(r) >= 1 for r in set(refs))
        if 0.8 <= razão <= 1.9 and refs_ok:
            return pt, True
        melhor = pt if not melhor or abs(razão - 1.15) < abs(len(melhor) / max(1, len(original)) - 1.15) else melhor
    return melhor, False


class Livro:
    def __init__(self, nome: str):
        self.nome = nome
        self.caminho = PASTA / f"{nome}.json"
        self.dados = json.loads(self.caminho.read_text(encoding="utf-8"))
        self.trava = threading.Lock()

    def salvar(self):
        tmp = self.caminho.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(self.dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        os.replace(tmp, self.caminho)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("livros", nargs="*")
    p.add_argument("--modelo", default="gemma4:12b-it-qat")
    p.add_argument("--paralelo", type=int, default=4)
    args = p.parse_args()

    nomes = args.livros or [l for l in PRIORIDADE if (PASTA / f"{l}.json").exists()]
    log = open(ROOT / "scripts" / "traducao-comentario.log", "a", encoding="utf-8")

    def registrar(msg: str):
        linha = f"{time.strftime('%d/%m %H:%M:%S')} {msg}"
        print(linha, flush=True)
        log.write(linha + "\n")
        log.flush()

    for nome in nomes:
        livro = Livro(nome)
        tarefas = []
        if livro.dados.get("intro") and not livro.dados.get("intro_pt"):
            tarefas.append(("intro", None))
        for cap, blocos in livro.dados["chapters"].items():
            for b in blocos:
                if not b.get("t_pt"):
                    tarefas.append((cap, b))
        if not tarefas:
            registrar(f"{nome}: já traduzido")
            continue
        registrar(f"{nome}: {len(tarefas)} blocos a traduzir")
        inicio = time.time()

        def um(tarefa):
            cap, bloco = tarefa
            original = livro.dados["intro"] if cap == "intro" else bloco["t"]
            partes = [traduzir_pedaço(args.modelo, converter_referencias(x)) for x in pedaços(original)]
            texto = "\n".join(t for t, _ in partes)
            ok = all(o for _, o in partes)
            with livro.trava:
                if cap == "intro":
                    livro.dados["intro_pt"] = texto
                else:
                    bloco["t_pt"] = texto
                    bloco["t_pt_auto"] = True
                    if not ok:
                        bloco["t_pt_revisar"] = True
                livro.salvar()
            if not ok:
                registrar(f"  conferir: {nome} {cap}:{bloco['s'] if bloco else 'intro'} (tamanho ou referência fora do esperado)")

        with ThreadPoolExecutor(args.paralelo) as ex:
            list(ex.map(um, tarefas))
        registrar(f"{nome}: pronto em {(time.time() - inicio) / 60:.0f} min")


if __name__ == "__main__":
    main()
