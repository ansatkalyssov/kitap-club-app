-- Клубы қалмаған жүргізушінің рөлі оқырманға қайтады.
--
-- Клуб ашқан адам CreateClubForm ішінде facilitator болып белгіленеді
-- (src/components/clubs/CreateClubForm.tsx). Ал кері жол болмаған:
-- клубы өшірілсе де, адам жүргізуші күйінде қалып қоятын.
--
-- Тексеру қолданбада емес, дерекқорда жүреді. Себебі қолданбада клубты
-- өшіретін код жоқ — клубтар Supabase панелінен қолмен өшіріледі,
-- сондықтан қолданба коды ешқашан іске қосылмас еді.

create or replace function public.demote_facilitator_without_clubs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := old.facilitator_id;
begin
  if target is null then
    return null;
  end if;

  -- Басқа белсенді клубы бар болса — рөлі сақталады. Бір адам бірнеше
  -- клуб жүргізуі мүмкін.
  if exists (
    select 1 from clubs
    where facilitator_id = target and is_active
  ) then
    return null;
  end if;

  -- Тек facilitator түсіріледі. Админ сол күйінде қалады.
  update profiles
  set role = 'reader'
  where id = target and role = 'facilitator';

  return null;
end;
$$;

-- Клуб мүлдем өшірілгенде
drop trigger if exists clubs_demote_facilitator_del on public.clubs;
create trigger clubs_demote_facilitator_del
  after delete on public.clubs
  for each row
  execute function public.demote_facilitator_without_clubs();

-- Клуб өшірілмей, тек жабылғанда (is_active = false) немесе жүргізушісі
-- ауысқанда. Соңғы жағдайда ескі жүргізушінің басқа клубы бар-жоғы
-- тексеріледі.
drop trigger if exists clubs_demote_facilitator_upd on public.clubs;
create trigger clubs_demote_facilitator_upd
  after update of is_active, facilitator_id on public.clubs
  for each row
  when (
    old.is_active is distinct from new.is_active
    or old.facilitator_id is distinct from new.facilitator_id
  )
  execute function public.demote_facilitator_without_clubs();

-- Бұрыннан жиналып қалғанын түзету. Қазір бұған бір ғана адам түседі.
-- Орындар алдында кімге тиетінін көргіңіз келсе, алдымен мынаны шақырыңыз:
--
--   select p.id, p.name from profiles p
--   where p.role = 'facilitator'
--     and not exists (select 1 from clubs c
--                     where c.facilitator_id = p.id and c.is_active);
--
update profiles p
set role = 'reader'
where p.role = 'facilitator'
  and not exists (
    select 1 from clubs c
    where c.facilitator_id = p.id and c.is_active
  );
