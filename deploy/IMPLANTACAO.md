# Implantação numa VPS com Docker Swarm + Traefik (Portainer)

Como o app foi colocado no ar: um serviço próprio, isolado, ao lado de outros
serviços que já rodam na mesma VPS (automação, banco etc.), atrás do Traefik
que já emite os certificados HTTPS.

```
navegador ──HTTPS──▶ Traefik ──▶ biblia_app (Next.js standalone, porta 3000)
                                   ├─ /app/public/narracao                 ◀─ /opt/biblia/narracao   (MP3 + tempos)
                                   └─ /app/public/commentary/matthew-henry ◀─ /opt/biblia/comentario (JSON traduzido)
              └──────────────────▶ Supabase (login + anotações; tabelas biblia_*)
```

## Recursos

O app usa ~45 MB de memória em repouso (limitado a 512 MB na stack) e quase
nada de CPU. A narração completa ocupa ~2,3 GB em disco e o comentário ~35 MB.

## 1. Supabase

1. No **SQL Editor** do Studio, rodar `supabase/schema.sql` inteiro.
2. Se o PostgREST roda em Swarm, forçar a atualização do serviço `*_rest`
   (senão a API não enxerga as tabelas novas — erro `PGRST205`).
3. No serviço de login (GoTrue), deixar `GOTRUE_EXTERNAL_EMAIL_ENABLED=true` e
   `GOTRUE_DISABLE_SIGNUP=true`: login por e-mail ligado, cadastro livre
   fechado. A conta do dono é criada pelo Studio (**Authentication → Users →
   Add user → Create new user**, com senha e *Auto Confirm*).

## 2. Imagem do app

Montada no computador local (poupa a memória da VPS) e enviada pronta:

```bash
# variáveis públicas do navegador (entram no código no momento do build)
export NEXT_PUBLIC_SUPABASE_URL=https://supabase.seudominio.com.br
export NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # a chave anon (pública)
export NEXT_PUBLIC_READER_NAME=André

docker build -f deploy/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg NEXT_PUBLIC_READER_NAME -t biblia-origens:3 .

docker save biblia-origens:3 | gzip -1 | ssh usuario@ip-da-vps 'gunzip | docker load'
```

## 3. Arquivos grandes (fora da imagem e do git)

```bash
rsync -a public/narracao/ usuario@ip-da-vps:/opt/biblia/narracao/
rsync -a public/commentary/matthew-henry/ usuario@ip-da-vps:/opt/biblia/comentario/

# pasta onde o app guarda o áudio do comentário (o container roda como uid 1000)
ssh usuario@ip-da-vps 'mkdir -p /opt/biblia/audio-comentario && chown 1000:1000 /opt/biblia/audio-comentario'
```

Enquanto o comentário está sendo traduzido, `scripts/sincronizar-comentario.sh`
repete o segundo envio a cada 20 min (lê `BIBLIA_VPS` e `BIBLIA_SSH_KEY` do
ambiente). O app lê os JSON do volume a cada acesso: livro atualizado aparece
sem reiniciar nada.

## 4. Stack no Portainer

**Stacks → Add stack → Web editor**, colar `deploy/stack-portainer.yml`
(trocando o domínio) e **Deploy the stack**. O DNS do domínio precisa apontar
para a VPS; o Traefik emite o certificado no primeiro acesso.

## Atualizar o app

1. `docker build` com uma tag nova (`biblia-origens:4`) e `docker load` na VPS.
2. `docker service update --image biblia-origens:4 biblia_app` — ou, no
   Portainer, trocar a tag no editor da stack e **Update the stack**.

Atenção: se a imagem for trocada só pelo comando, atualize também a tag no
editor da stack do Portainer — senão um "Update the stack" futuro volta para a
versão antiga.

## Cuidados com um Supabase compartilhado

- Antes de publicar a chave anon num site, confira se as tabelas dos outros
  sistemas no schema `public` têm RLS: a chave anon é pública e, sem RLS, lê e
  grava tudo que tiver permissão padrão.
- Em Swarm, **não** reenvie a stack inteira do Supabase para mudar uma variável:
  ela volta ao estado do arquivo (inclusive serviços que foram desligados à
  mão). Edite só o serviço.
