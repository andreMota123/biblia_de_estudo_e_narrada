# Bíblia de Estudo e Narrada

App pessoal de leitura e estudo da Bíblia, com a **Bíblia inteira narrada**
por voz neural em português, o texto destacado versículo a versículo enquanto
é lido, análise interlinear em hebraico e grego, comentário de Matthew Henry
em português, caderno de estudo, favoritos, destaques e notas.

## Créditos — projeto original

Este repositório é uma **versão derivada do [Bíblia Origens](https://github.com/ernandes150-del/biblia-estudo-app-origens)**,
criado por **Ernandes Machado Arruda** ([@ernandes150-del](https://github.com/ernandes150-del)).
Toda a base do app é trabalho dele: a leitura com interlinear hebraico/grego,
o dicionário (Strong's, BDB, Abbott-Smith), as ocorrências de cada palavra, as
referências cruzadas, o comentário de Matthew Henry e sua tradução
inicial, o caderno de estudo, favoritos, destaques, busca, a identidade visual
e o logo do Álef (א). O histórico completo de commits dele está preservado
neste repositório.

O projeto original não declara uma licença de uso; os direitos sobre o código
original são do autor. Esta versão foi feita para uso pessoal, e qualquer
pedido do autor sobre este repositório será atendido.

O que foi acrescentado nesta versão está em [`docs/HISTORICO.md`](docs/HISTORICO.md);
o mapa de todos os arquivos, em [`docs/ARVORE.md`](docs/ARVORE.md).

## O que esta versão acrescenta

- **Narração da Bíblia inteira** (1.189 capítulos, ~84 h) com voz neural
  natural, e player com destaque do versículo narrado, velocidade, timer de
  dormir, continuação automática de capítulo e controles na tela bloqueada.
- **Comentário de Matthew Henry em português**, traduzido uma única vez com IA
  local, sem API paga, com opção de ver o original em inglês.
- **Modo local** (funciona sem Supabase), "continuar de onde parou", app
  instalável no celular (PWA).
- **Implantação numa VPS** com Docker Swarm + Traefik, ao lado de outros
  serviços, e Supabase com acesso restrito ao dono das anotações.

## Rodar no computador

```bash
npm install
cp .env.local.example .env.local   # sem Supabase, o app roda em modo local
npm run dev
```

A narração não fica no git (~2,3 GB). Para gerar (precisa de `ffmpeg` e
`pip install edge-tts`):

```bash
python3 scripts/gerar-narracao.py Salmos 23     # um capítulo
python3 scripts/gerar-narracao.py --tudo        # a Bíblia inteira
```

Para traduzir o comentário com IA local (precisa do Ollama com
`gemma4:12b-it-qat` ou outro modelo):

```bash
python3 scripts/traduzir-comentario.py            # tudo, retomável
python3 scripts/traduzir-comentario.py Romanos    # um livro
```

Publicar numa VPS: [`deploy/IMPLANTACAO.md`](deploy/IMPLANTACAO.md).

## Créditos dos dados e ferramentas

Do projeto original:

- **Texto bíblico:** Bíblia Livre (CC BY 4.0, [eBible.org](https://ebible.org)).
  A narração é derivada deste texto e segue a mesma atribuição.
- **Léxico interlinear** (Strong's, gramática e morfologia hebraica/grega) em
  `public/lexicon/`: derivado do **STEPBible-Data**, de "STEP Bible"
  ([www.STEPBible.org](https://www.STEPBible.org)), com base em trabalho da
  Tyndale House, Cambridge, sob **CC BY 4.0**
  ([STEPBible-Data](https://github.com/STEPBible/STEPBible-Data)).
- **Dicionário completo** em `public/dictionary/`: mesma fonte, com base no
  **BDB** (Brown-Driver-Briggs, hebraico) e no **léxico de Abbott-Smith**
  (grego), obras de domínio público.
- **Palavras de Jesus** (`isJesusWords`): dataset `red_letter_verses.json` do
  projeto **KJV Study** (kennethreitz/kjvstudy.org), licença ISC.
- **Referências cruzadas** em `public/cross-references/`: **Treasury of
  Scripture Knowledge**, via KJV Study (originalmente OpenBible.info, CC BY).
- **Comentário bíblico** em `public/commentary/matthew-henry/`: **Matthew
  Henry** (1662-1714), domínio público, obtido via **Free Use Bible API**
  (bible.helloao.org, HelloAO Lab, MIT / CC Public Domain Mark). Cobre 65 dos
  66 livros (a fonte não tem comentário de Cânticos dos Cânticos).

Desta versão:

- **Narração:** voz neural *pt-BR-AntonioNeural* da Microsoft, gerada com a
  biblioteca [edge-tts](https://github.com/rany2/edge-tts).
- **Tradução do comentário:** modelo **Gemma 4 12B** (Google, termos de uso do
  Gemma) rodando localmente no [Ollama](https://ollama.com). É tradução
  automática, marcada como tal no app.
- Desenvolvido com a ajuda do Claude (Anthropic), pelo Claude Code.

## Tecnologia

Next.js 16 · React 19 · Tailwind CSS 4 · Supabase (Auth + Postgres) · Docker
Swarm + Traefik.
