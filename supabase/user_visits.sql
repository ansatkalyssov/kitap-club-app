-- Кіру статистикасы.
--
-- Бұған дейін қолданбада «адам кірді» деген оқиға мүлдем жазылмайтын.
-- Сессия ұзақ сақталатындықтан auth.users.last_sign_in_at та жарамайды:
-- адам айына бір рет кіріп, күн сайын қолдана береді.
--
-- Сондықтан екі нәрсе сақталады:
--   user_visits         — күн сайын бір жол: кім қай күні кірді
--   profiles.last_seen_at — соңғы рет қашан көрінгені
--
-- user_visits күндік графикке керек: last_seen_at тек ағымдағы күйді
-- көрсетеді, ал тарихты бермейді.

create table if not exists public.user_visits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

create index if not exists user_visits_date_idx on public.user_visits (date);

-- Жазуды тек сервер service_role кілтімен жасайды, сондықтан клиентке
-- ашық саясат керек емес. RLS қосулы, саясат жоқ — яғни жабық.
alter table public.user_visits enable row level security;

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

comment on table public.user_visits is
  'Күндік кіру белгісі: бір адамға бір күнде бір жол.';
comment on column public.profiles.last_seen_at is
  'Оқырман қолданбада соңғы рет көрінген уақыт.';
