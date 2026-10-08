-- =============================================
-- Жылдамдық: жетіспейтін индекстер мен рейтингтегі орын
-- =============================================
--
-- PostgreSQL сыртқы кілтке индексті өзі жасамайды. Сондықтан ең жиі
-- сұралатын екі баған индекссіз қалып, толық сканерге түсіп отырған.

-- 1. book_trackers.user_id
--
-- Ең ауыры осы. readers_directory функциясы әр оқырман үшін бұл кестені
-- үш рет қарайды (бітірген кітап саны, оқып жатқаны, ағымдағы кітабы).
-- Индекссіз ол 292 оқырман × 948 жол = 800 мыңнан астам жол оқу болып
-- шығады, әрі басты бет ашылған сайын қайталанады.
create index if not exists book_trackers_user_idx
  on public.book_trackers (user_id);

-- 2. club_members.user_id
--
-- Кестеде UNIQUE(club_id, user_id) индексі бар, бірақ ол club_id-дан
-- басталады. Ал біз әр бетте «осы адам қай клубтарда» деп сұраймыз —
-- ондай сұрауға бұл индекс жарамайды.
create index if not exists club_members_user_idx
  on public.club_members (user_id);

-- =============================================
-- 3. Оқырманның рейтингтегі орны
-- =============================================
--
-- Бұрын басты бет readers_directory-ді толық шақыратын: 292 оқырманның
-- ұпайын, кітабын, клубын есептеп, тізімнен өз орнын іздейтін. Бізге
-- керегі — бір сан.
--
-- Реті readers_directory-мен бірдей болуы керек, әйтпесе басты беттегі
-- орын мен рейтиң бетіндегі орын бір-біріне сәйкес келмейді: алдымен
-- ұпай, сосын аты.

create or replace function public.reader_rank(target uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  with totals as (
    select
      p.id,
      p.name,
      coalesce((select sum(e.points) from point_events e where e.user_id = p.id), 0) as pts
    from profiles p
  ),
  ranked as (
    select id, row_number() over (order by pts desc, name nulls last) as rn
    from totals
  )
  select rn::integer from ranked where id = target and auth.uid() is not null;
$$;

grant execute on function public.reader_rank(uuid) to authenticated;
