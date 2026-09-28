#!/usr/bin/env bash
# Envia para a VPS o comentário traduzido, a cada 20 min, enquanto o
# tradutor (scripts/traduzir-comentario.py) estiver rodando; ao final, um
# último envio. O app lê os arquivos direto de /opt/biblia/comentario.
#
# O endereço da VPS e a chave SSH vêm do ambiente (ficam fora do repositório):
#   export BIBLIA_VPS=usuario@ip-da-vps
#   export BIBLIA_SSH_KEY=~/.ssh/minha_chave
cd "$(dirname "$0")/.."
: "${BIBLIA_VPS:?defina BIBLIA_VPS=usuario@ip-da-vps}"
SSH_KEY="${BIBLIA_SSH_KEY:-$HOME/.ssh/id_ed25519}"
enviar() {
  rsync -a --exclude '*.tmp' -e "ssh -i $SSH_KEY -o BatchMode=yes" \
    public/commentary/matthew-henry/ "$BIBLIA_VPS:/opt/biblia/comentario/" \
    && echo "$(date '+%d/%m %H:%M') enviado" >> scripts/sincronizacao.log
}
while pgrep -f traduzir-comentario.py > /dev/null; do
  enviar
  sleep 1200
done
enviar
echo "$(date '+%d/%m %H:%M') tradutor terminou — último envio feito" >> scripts/sincronizacao.log
