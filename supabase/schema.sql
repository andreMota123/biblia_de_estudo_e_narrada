-- Bíblia Origens — tabelas do app no Supabase
--
-- Pensado para um Supabase que também guarda dados de outros sistemas: tudo
-- do app leva o prefixo biblia_ e nada aqui toca em objeto que já existe.
--
-- Funciona também num banco em que objetos novos do schema public nascem
-- fechados para anon/authenticated (recomendado): cada tabela abaixo libera de
-- propósito só o necessário.
--   • notas de versículo e de palavra: o usuário logado lê e grava só as
--     próprias linhas (RLS por user_id);
--   • cache de traduções: nenhum acesso do navegador — só a rota do servidor,
--     com a service_role.
--
-- Rode inteiro no SQL Editor do Supabase Studio. Idempotente.
-- Supabase self-hosted com PostgREST em Docker Swarm: depois de rodar, force a
-- atualização do serviço rest (ex.: Portainer → Services → *_rest → Update
-- the service → Force update); sem isso a API responde PGRST205.

begin;

create or replace function public.biblia_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = '';

-- Notas por versículo (favorito, destaque, nota livre, estudo)
create table if not exists public.biblia_verse_notes (
  user_id         uuid references auth.users(id) on delete cascade not null,
  verse_key       text not null, -- ex: "Gênesis-1-1"
  favorite        boolean not null default false,
  highlighted     boolean not null default false,
  highlight_color text check (highlight_color in ('yellow', 'green', 'red', 'blue')),
  note            text not null default '',
  study           text not null default '',
  updated_at      timestamptz not null default now(),
  primary key (user_id, verse_key)
);

-- Notas ligadas à palavra original (Strong's), não a um versículo específico
create table if not exists public.biblia_word_notes (
  user_id     uuid references auth.users(id) on delete cascade not null,
  strong      text not null, -- ex: "H2617"
  note        text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, strong)
);

-- Cache das traduções do comentário de Matthew Henry (só a rota do servidor usa)
create table if not exists public.biblia_commentary_translations (
  book        text not null,
  chapter     int  not null,
  verse_start int  not null,
  verse_end   int  not null,
  text_pt     text not null,
  truncated   boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (book, chapter, verse_start)
);

alter table public.biblia_verse_notes             enable row level security;
alter table public.biblia_word_notes              enable row level security;
alter table public.biblia_commentary_translations enable row level security;

-- Permissões explícitas (o padrão do banco agora é fechado)
grant select, insert, update, delete on public.biblia_verse_notes to authenticated;
grant select, insert, update, delete on public.biblia_word_notes  to authenticated;
grant all on public.biblia_verse_notes, public.biblia_word_notes, public.biblia_commentary_translations to service_role;

-- Cada usuário só enxerga e altera as próprias anotações
drop policy if exists "biblia: dono das notas de versiculo" on public.biblia_verse_notes;
create policy "biblia: dono das notas de versiculo"
  on public.biblia_verse_notes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "biblia: dono das notas de palavra" on public.biblia_word_notes;
create policy "biblia: dono das notas de palavra"
  on public.biblia_word_notes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists biblia_verse_notes_updated_at on public.biblia_verse_notes;
create trigger biblia_verse_notes_updated_at
  before update on public.biblia_verse_notes
  for each row execute function public.biblia_set_updated_at();

drop trigger if exists biblia_word_notes_updated_at on public.biblia_word_notes;
create trigger biblia_word_notes_updated_at
  before update on public.biblia_word_notes
  for each row execute function public.biblia_set_updated_at();

commit;
