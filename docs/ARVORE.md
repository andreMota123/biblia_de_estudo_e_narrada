# Árvore do app

Mapa de cada pasta e arquivo do projeto e do que ele faz. Marcado com **★** o
que foi acrescentado nesta versão pessoal; sem marca, é do projeto original
([Bíblia Origens](https://github.com/ernandes150-del/biblia-estudo-app-origens),
de Ernandes Machado Arruda).

```
biblia_de_estudo_e_narrada/
├── app/                              aplicação Next.js 16 (App Router), tudo client-side numa página só
│   ├── page.tsx                      estado central: livro/capítulo, login, anotações, busca — e ★ o player
│   │                                 da narração, ★ o "modo local" sem Supabase e ★ "continuar de onde parou"
│   ├── layout.tsx                    <html>, tema claro/escuro, ★ metadados de app instalável, ★ fontes de
│   │                                 leitura (next/font: Literata, Merriweather, Lora, EB Garamond, Atkinson)
│   ├── manifest.ts                 ★ manifesto PWA (instalar na tela inicial do celular)
│   ├── apple-icon.png              ★ ícone do iPhone (o Álef א)
│   ├── globals.css                   cores do tema (variáveis CSS) e animações
│   ├── types.ts                      tipos compartilhados (livro, versículo, anotação, palavra interlinear)
│   │
│   ├── components/
│   │   ├── HomeView.tsx              tela inicial: login e hub de ícones — ★ cartão "Continuar de onde parou"
│   │   │                             (Ler / Ouvir) e ★ o "olhinho" para mostrar a senha
│   │   ├── Header.tsx                barra superior: abas, livro/capítulo, tema, sair
│   │   ├── ReadView.tsx              leitura: versículos, interlinear hebraico/grego, painéis de contexto,
│   │   │                             estudo, referências, palavra original e comentário — ★ "Ouvir capítulo",
│   │   │                             ★ "Ouvir daqui", ★ destaque/rolagem do versículo narrado, ★ aviso de
│   │   │                             tradução automática e "ver o original em inglês", ★ botão "Aa" (tamanho e fonte da letra)
│   │   ├── LibraryView.tsx         ★ aba Biblioteca: lista de livros e leitura por capítulo
│   │   ├── PrivateCommentaryPanel.tsx ★ comentário de uso pessoal no painel (seção do versículo)
│   │   ├── CommentaryAudioBox.tsx  ★ botão e player "Ouvir comentário"
│   │   ├── AudioPlayer.tsx         ★ barra do player: anterior/tocar/próximo, velocidade, timer de dormir,
│   │   │                             continuar no próximo capítulo
│   │   ├── StudyEditor.tsx           editor em blocos do caderno de estudo
│   │   ├── StudiesView.tsx           lista "Meus Estudos"
│   │   ├── FavoritesView.tsx         versículos favoritos
│   │   ├── HighlightsView.tsx        passagens destacadas (4 cores)
│   │   ├── WordNotesView.tsx         notas ligadas a palavras originais (Strong's)
│   │   ├── SearchView.tsx            busca em português, por Strong's ou por transliteração
│   │   └── AuthNotice.tsx            aviso "faça login para…"
│   │
│   ├── lib/
│   │   ├── server/privado.ts       ★ passe de acesso (cookie assinado) e pasta privada
│   │   ├── privateCommentary.ts    ★ carrega comentários privados e acha a seção do versículo
│   │   ├── commentarySpeech.ts     ★ prepara o comentário para a fala: "Rm 4.11" → "Romanos 4, 11",
│   │   │                             "II." → "Segundo:"
│   │   ├── readingFonts.ts         ★ tamanho e fonte da letra da leitura (7 fontes, 14–30 px)
│   │   ├── useBibleAudio.ts        ★ o motor da narração: toca o MP3 do capítulo, lê o JSON de tempos para
│   │   │                             saber o versículo atual, pula versículos, avança capítulos, controles da
│   │   │                             tela bloqueada (Media Session), lembra a posição
│   │   ├── supabaseClient.ts         cliente Supabase — ★ detecta "modo local" quando não configurado
│   │   ├── userDataStore.ts          grava/lê anotações no Supabase (tabelas ★ biblia_*) — ★ ou no
│   │   │                             navegador, no modo local
│   │   ├── commentary.ts             carrega o comentário de Matthew Henry por livro; tradução sob demanda
│   │   ├── lexicon.ts                carrega o interlinear de um livro (public/lexicon)
│   │   ├── dictionary.ts             entradas do dicionário BDB / Abbott-Smith
│   │   ├── curatedDictionary.ts      verbetes curados em português
│   │   ├── occurrences.ts            onde cada palavra original aparece na Bíblia
│   │   ├── crossReferences.ts        referências cruzadas (Treasury of Scripture Knowledge)
│   │   ├── morphology.ts             decodifica os códigos de morfologia hebraica/grega
│   │   ├── glossTranslation.ts       traduz as glosas do léxico para o português
│   │   ├── wordSearch.ts             reconhece Strong's/transliteração na busca
│   │   ├── studyBlocks.ts            formato dos blocos do caderno de estudo
│   │   ├── format.ts                 formatação de transliteração
│   │   └── icons.tsx                 ícones SVG — ★ fones, play/pausa, anterior/próximo, lua, olho
│   │
│   ├── api/comentario-audio/
│   │   └── route.ts                ★ narra um bloco do comentário sob demanda (voz Antonio, edge-tts na imagem),
│   │                                 em pedaços paralelos; guarda o MP3 e responde a Range (iPhone)
│   │
│   ├── api/privado/                ★ Biblioteca pessoal (só com login): sessao/ (emite o passe),
│   │                                 comentario/ (comentários de uso pessoal), biblioteca/ (livros)
│   │
│   ├── api/translate-commentary/
│   │   └── route.ts                  tradução sob demanda de um bloco do comentário (API da Anthropic, com
│   │                                 cache no Supabase) — ★ usa a chave service_role só no servidor
│   │
│   └── data/                         dicionários pequenos embutidos no código
│       ├── gloss-dict-pt.json        glosas inglês → português
│       ├── morph-greek-en.json       códigos de morfologia grega
│       ├── morph-hebrew-en.json      códigos de morfologia hebraica
│       └── morph-terms-pt.json       termos gramaticais em português
│
├── data/                             dados embutidos no build
│   ├── bible/
│   │   ├── bible.json                texto da Bíblia Livre (66 livros), gerado pelo import-bible.js
│   │   ├── fonte/                    69 arquivos USFM da Bíblia Livre (eBible.org)
│   │   └── biblia-livre.zip          pacote original baixado
│   └── study/context.json            autor, data, tema e contexto histórico de cada livro
│
├── public/                           arquivos servidos direto ao navegador
│   ├── lexicon/                      66 JSON, um por livro — interlinear palavra a palavra (66 MB)
│   ├── occurrences/                  25.123 JSON, um por Strong's — ocorrências (116 MB)
│   ├── dictionary/                   dicionário completo hebraico/grego + índice de transliteração
│   ├── cross-references/             66 JSON — referências cruzadas por versículo
│   ├── commentary/matthew-henry/     65 JSON — comentário por livro; ★ campos t_pt / t_pt_auto / intro_pt
│   │                                 com a tradução local (ver scripts/traduzir-comentario.py)
│   ├── search-index/                 índice da busca
│   ├── narracao/                   ★ (fora do git, ~2,3 GB) pt-BR-AntonioNeural/<Livro>/<cap>.mp3 + .json
│   │                                 com o início/fim de cada versículo — 1.189 capítulos, ~84 h de áudio
│   └── icon-192.png, icon-512.png,
│       icon-maskable-512.png       ★ ícones do app instalável
│
├── scripts/
│   ├── import-bible.js               USFM → data/bible/bible.json
│   ├── gerar-narracao.py           ★ gera a narração neural (voz Antonio): um MP3 por capítulo, versículo
│   │                                 por versículo, com pausas e tempos exatos
│   ├── traduzir-comentario.py      ★ traduz o comentário com IA local (Ollama / Gemma 4 12B na GPU), sem
│   │                                 API paga; converte as referências bíblicas por código; retomável
│   └── sincronizar-comentario.sh   ★ envia o comentário traduzido para a VPS a cada 20 min
│
├── supabase/
│   └── schema.sql                  ★ reescrito: tabelas biblia_* com RLS "só o dono" e permissões explícitas
│
├── deploy/                         ★ tudo novo
│   ├── Dockerfile                    imagem de produção (Next.js standalone, Node 22 Alpine)
│   ├── stack-portainer.yml           stack Docker Swarm: Traefik, volumes da narração e do comentário
│   └── IMPLANTACAO.md                passo a passo da implantação na VPS
│
├── docs/                           ★
│   ├── ARVORE.md                     este arquivo
│   └── HISTORICO.md                  o que foi feito nesta versão, e por quê
│
├── next.config.ts                    ★ output: "standalone" (servidor enxuto para o Docker)
├── .env.local.example                variáveis de ambiente — ★ modo local, nome do leitor, narração
├── .dockerignore                   ★ deixa narração, .env e node_modules fora da imagem
├── package.json                      Next 16.3, React 19.2, Tailwind 4, supabase-js
├── AGENTS.md / CLAUDE.md             instruções para agentes de código (do original)
└── README.md                         visão geral, créditos, como rodar
```

## Como as peças se ligam na leitura com áudio

```
ReadView  "Ouvir capítulo" ──▶ page.tsx: audio.play({livro, cap, vers})
                                   │
                                   ▼
                        useBibleAudio (um <audio> só, vive fora da tela de leitura)
                          ├─ busca  /narracao/<voz>/<Livro>/<cap>.json   (tempos dos versículos)
                          ├─ toca   /narracao/<voz>/<Livro>/<cap>.mp3    a partir do versículo pedido
                          ├─ timeupdate → versículo atual → ReadView destaca e rola a tela
                          ├─ fim do capítulo → próximo capítulo (a tela acompanha)
                          └─ Media Session → controles da tela bloqueada e do fone
                                   │
                                   ▼
                        AudioPlayer (barra inferior): ⏮ ▶/⏸ ⏭ · velocidade · timer · fechar
```

## Onde cada dado mora

| Dado | Onde | Quem grava |
|---|---|---|
| Texto bíblico | `data/bible/bible.json` (no build) | `scripts/import-bible.js` |
| Narração | `public/narracao/` → volume `/opt/biblia/narracao` | `scripts/gerar-narracao.py` |
| Comentário (EN + PT) | `public/commentary/` → volume `/opt/biblia/comentario` | `scripts/traduzir-comentario.py` |
| Áudio do comentário | volume `/opt/biblia/audio-comentario` (gerado na 1ª vez que é ouvido) | `app/api/comentario-audio` |
| Favoritos, destaques, estudos, notas | Supabase: `biblia_verse_notes`, `biblia_word_notes` | o app, por usuário (RLS) |
| Posição de leitura e de áudio, tema, velocidade, tamanho e fonte da letra | `localStorage` do navegador | o app |
