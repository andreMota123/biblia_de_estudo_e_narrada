# Histórico desta versão

O que foi feito a partir do projeto original
[Bíblia Origens](https://github.com/ernandes150-del/biblia-estudo-app-origens)
(commit `24ddb032`, "Conclui a tradução de Judas"), para transformá-lo num app
pessoal de leitura e estudo com a Bíblia narrada. Trabalho de 27/09/2026.

## 1. Narração natural da Bíblia inteira

**Pedido:** ouvir a leitura da Bíblia com uma voz que não soe mecânica.

- A primeira versão usava a voz do próprio navegador (Web Speech API); foi
  descartada por soar robótica em muitos aparelhos.
- A narração passou a ser **gerada com voz neural** (pt-BR, voz *Antonio*,
  escolhida entre Antonio, Francisca e Thalita depois de ouvir amostras do
  Salmo 23 e de João 1).
- `scripts/gerar-narracao.py` narra **cada versículo separadamente**, junta tudo
  num MP3 por capítulo com pausas curtas (0,55 s entre versículos, 0,9 s depois
  do título "Salmos, capítulo 23.") e grava um JSON com o início e o fim exatos
  de cada versículo, calculados a partir das próprias amostras de áudio.
- Antes da fala, o texto é ajustado: palavras em caixa alta ("SENHOR") viram
  "Senhor" (algumas vozes soletravam) e "1 Coríntios" é anunciado como
  "Primeira Coríntios".
- Resultado: **1.189 capítulos, ~84 horas de áudio, 2,3 GB**, todos conferidos
  (número de versículos e tempos válidos em cada capítulo).

## 2. Player dentro do app

- `app/lib/useBibleAudio.ts`: um único `<audio>` que vive fora da tela de
  leitura, para continuar tocando ao trocar de capítulo ou de aba.
- Destaca e rola até o versículo sendo narrado; "Ouvir capítulo" e "Ouvir
  daqui" (de qualquer versículo); anterior/próximo versículo; velocidade de
  0,8× a 1,5× (sem alterar o tom); timer para parar depois de 15–60 min;
  continua sozinho no próximo capítulo (e a tela acompanha).
- Por ser áudio de verdade, o celular mostra os controles na tela bloqueada e
  continua tocando com a tela apagada (Media Session API).
- Lembra onde a narração parou; a tela inicial mostra "Continuar de onde
  parou" com os botões Ler e Ouvir.

## 3. App pessoal e instalável

- **Modo local:** sem Supabase configurado, o app abre direto (sem login) e
  guarda favoritos, destaques e notas no navegador. Antes, sem Supabase, ficava
  preso na tela de login.
- Reabre no último capítulo lido.
- Manifesto PWA e ícones (o Álef א do logo original): dá para instalar na tela
  inicial do celular.
- A página só é desenhada depois de hidratada, porque quase todo o estado
  inicial vem do `localStorage` (evita diferenças entre servidor e navegador).
- "Olhinho" para mostrar a senha no login; saudação com o nome do leitor.

## 4. Comentário de Matthew Henry em português, sem API

**Pedido:** ter o comentário traduzido de uma vez, sem pagar API e sem traduzir
toda vez que abrir.

- `scripts/traduzir-comentario.py` traduz os 4.124 blocos (~31 milhões de
  caracteres) com uma **IA local** — Ollama com Gemma 4 12B, na placa de vídeo —
  e grava o resultado nos próprios arquivos do comentário (`t_pt`), que o app
  já sabia exibir.
- As referências bíblicas são convertidas **por código antes** da IA
  ("Ch1 1:4" → "1Cr 1.4"): nos testes, o modelo trocava algumas.
- Cada trecho é conferido (tamanho plausível e referências preservadas); os que
  saem fora do esperado ficam marcados (`t_pt_revisar`).
- O app avisa "(tradução automática)" e oferece "Ver o original em inglês".
- Ordem: Novo Testamento, Salmos e Provérbios, depois o resto do Antigo
  Testamento. ~29 h de GPU no total; o processo é retomável.

## 5. Publicação na VPS

- Imagem Docker (`deploy/Dockerfile`, Next.js *standalone*) montada no
  computador local e carregada na VPS, para não gastar a memória do servidor.
- Serviço próprio numa stack Docker Swarm, atrás do Traefik que já atendia os
  outros serviços da VPS; narração e comentário em volumes, fora da imagem.
- Supabase da própria VPS para login e anotações: tabelas com prefixo
  `biblia_`, RLS "cada usuário só vê as próprias anotações", cadastro livre
  fechado (só a conta do dono).
- Detalhes em [`deploy/IMPLANTACAO.md`](../deploy/IMPLANTACAO.md).

## 6. Correções no projeto original

- `supabase/schema.sql` não criava a coluna `highlight_color` nem a tabela de
  cache de traduções que o código já usava.
- A rota de tradução passou a usar a chave `service_role` só no servidor — o
  cache de traduções não fica mais aberto para o navegador.
