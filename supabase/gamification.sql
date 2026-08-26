-- =============================================
-- Геймификация: ұпай журналы, карточкалар
-- =============================================

-- ---------------------------------------------
-- 1. Ұпай журналы (append-only ledger)
-- ---------------------------------------------
-- Әр ұпай жеке жазба болып сақталады. Жалпы сома осы жазбалардан
-- есептеледі — сондықтан "неге ұпай алдым" тарихын көрсетуге болады
-- және қате болса қайта есептеуге келеді.

CREATE TABLE public.point_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  points INTEGER NOT NULL,

  -- Идемпоттық кілті. Бір оқиға екі рет төленбеуі үшін әрқашан толтырылады:
  --   daily_goal          -> '2026-08-26'
  --   tracker_progress    -> '{tracker_id}:2026-08-26'
  --   book_done           -> '{tracker_id}'
  --   analysis_write      -> '{analysis_id}'
  --   club_join           -> '{club_id}'
  --   streak_week         -> '2026-08-26'  (тізбек толған күн)
  --   streak_7 / _30 ...  -> 'once'        (өмірде бір рет)
  ref_id TEXT NOT NULL,

  -- Қазақстан уақыты бойынша күн. Күндік шекті есептеу үшін —
  -- created_at::date қолданылмайды, ол UTC-де басқа күн береді.
  event_date DATE NOT NULL,

  -- Күндік 150 шегіне кіре ме
  capped BOOLEAN NOT NULL DEFAULT true,

  -- Клуб айлық рейтингіне қосыла ма. Бір адамға бір рет берілетін
  -- ұпайлар (клубқа қосылу, шақыру) false болады — әйтпесе рейтингте
  -- "кім көп адам әкелді" деген өлшемге айналады.
  --
  -- Клуб мұнда сақталмайды: адам бірнеше клубта бола алады, әрі мүшелік
  -- өзгереді. Рейтинг сұрау кезінде club_members арқылы қосылады.
  counts_for_club BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX point_events_idem_idx
  ON public.point_events (user_id, code, ref_id);

CREATE INDEX point_events_user_date_idx
  ON public.point_events (user_id, event_date);

CREATE INDEX point_events_club_calc_idx
  ON public.point_events (event_date, user_id)
  WHERE counts_for_club;

-- ---------------------------------------------
-- 2. Карточкалар
-- ---------------------------------------------

CREATE TABLE public.cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  book_title TEXT,
  author TEXT,
  quote TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  -- Бос болса — ою генераторы карточканың code-інен сурет жасайды.
  -- Дизайнер портрет дайындағанда осы өріс толтырылады, басқа ештеңе өзгермейді.
  art_url TEXT,

  unlock_type TEXT NOT NULL CHECK (unlock_type IN ('starter', 'threshold', 'random', 'achievement')),
  threshold INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX user_cards_user_idx ON public.user_cards (user_id);

-- Тіркелген бойда берілетін бастау карточкасы
INSERT INTO public.cards (code, name, book_title, author, quote, rarity, unlock_type, sort_order)
VALUES (
  'kozha',
  'Қожа',
  'Менің атым Қожа',
  'Бердібек Соқпақбаев',
  'Мен бір сөзді айтсам, орындауға тиіспін',
  'common',
  'starter',
  1
);

-- ---------------------------------------------
-- 3. Барлық пікір жоспарға байланады
-- ---------------------------------------------

-- Жауаптар ата-пікірінің жоспарын мұралайды
UPDATE public.book_analyses r
SET club_plan_id = p.club_plan_id
FROM public.book_analyses p
WHERE r.parent_id = p.id AND r.club_plan_id IS NULL;

-- Жоспарсыз қалғандары клубтың соңғы жоспарына бекітіледі
UPDATE public.book_analyses a
SET club_plan_id = (
  SELECT p.id FROM public.club_plans p
  WHERE p.club_id = a.club_id
  ORDER BY p.year DESC, p.month DESC
  LIMIT 1
)
WHERE a.club_plan_id IS NULL;

-- Клубында бірде-бір жоспар жоқ пікірлер қалса — оларды сақтауға болмайды
DELETE FROM public.book_analyses WHERE club_plan_id IS NULL;

-- Жауап әрқашан ата-пікірдің жоспарына жатады. Триггер оны автоматты
-- толтырады — сондықтан жауап формасына жоспарды білудің қажеті жоқ.
CREATE OR REPLACE FUNCTION public.inherit_analysis_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NEW.club_plan_id IS NULL THEN
    SELECT club_plan_id INTO NEW.club_plan_id
    FROM book_analyses WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER book_analyses_inherit_plan
  BEFORE INSERT ON public.book_analyses
  FOR EACH ROW EXECUTE FUNCTION public.inherit_analysis_plan();

ALTER TABLE public.book_analyses
  ALTER COLUMN club_plan_id SET NOT NULL;

CREATE INDEX book_analyses_plan_idx
  ON public.book_analyses (club_plan_id, created_at DESC);

-- ---------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

-- Ұпайды тек өзінікін оқиды. INSERT саясаты ӘДЕЙІ жоқ —
-- жазуды тек сервер service_role кілтімен істейді, әйтпесе кез келген
-- қолданушы браузерден өзіне ұпай қоса алар еді.
CREATE POLICY "point_events_select_own" ON public.point_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cards_select_all" ON public.cards
  FOR SELECT USING (true);

CREATE POLICY "user_cards_select_own" ON public.user_cards
  FOR SELECT USING (auth.uid() = user_id);

-- Профильде басқа адамның карточкасын көрсету үшін клубтас болса — көреді
CREATE POLICY "user_cards_select_clubmates" ON public.user_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.club_members me
      JOIN public.club_members them ON them.club_id = me.club_id
      WHERE me.user_id = auth.uid() AND them.user_id = user_cards.user_id
    )
  );

-- ---------------------------------------------
-- 5. Клуб рейтингі
-- ---------------------------------------------
-- RLS басқа қолданушының ұпайын оқуға жол бермейді, сондықтан
-- рейтинг SECURITY DEFINER функциясы арқылы жиынтық түрде беріледі.
-- Жеке ұпайлар сыртқа шықпайды — тек клуб қосындысы.

CREATE OR REPLACE FUNCTION public.club_leaderboard(period_start DATE, period_end DATE)
RETURNS TABLE (
  club_id UUID,
  club_name TEXT,
  emblem_url TEXT,
  member_count BIGINT,
  total_points BIGINT,
  avg_points NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH members AS (
    SELECT club_id, user_id FROM club_members
  ),
  scored AS (
    SELECT
      m.club_id,
      COALESCE(SUM(e.points), 0) AS pts
    FROM members m
    LEFT JOIN point_events e
      ON e.user_id = m.user_id
     AND e.counts_for_club
     AND e.event_date BETWEEN period_start AND period_end
    GROUP BY m.club_id
  )
  SELECT
    c.id,
    c.name,
    c.emblem_url,
    (SELECT COUNT(*) FROM members m WHERE m.club_id = c.id),
    COALESCE(s.pts, 0),
    ROUND(
      COALESCE(s.pts, 0)::NUMERIC
      / GREATEST((SELECT COUNT(*) FROM members m WHERE m.club_id = c.id), 1),
      1
    )
  FROM clubs c
  LEFT JOIN scored s ON s.club_id = c.id
  WHERE c.is_active
  ORDER BY 5 DESC, 2 ASC;
$$;

GRANT EXECUTE ON FUNCTION public.club_leaderboard(DATE, DATE) TO authenticated;

-- Клуб ішіндегі мүшелер рейтингі — тек сол клуб мүшесіне көрінеді
CREATE OR REPLACE FUNCTION public.club_member_leaderboard(target_club UUID, period_start DATE, period_end DATE)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  total_points BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.avatar_url,
    COALESCE(SUM(e.points), 0)
  FROM club_members m
  JOIN profiles p ON p.id = m.user_id
  LEFT JOIN point_events e
    ON e.user_id = p.id
   AND e.event_date BETWEEN period_start AND period_end
  WHERE m.club_id = target_club
    AND EXISTS (
      SELECT 1 FROM club_members me
      WHERE me.club_id = target_club AND me.user_id = auth.uid()
    )
  GROUP BY p.id, p.name, p.avatar_url
  ORDER BY 4 DESC, 2 ASC;
$$;

GRANT EXECUTE ON FUNCTION public.club_member_leaderboard(UUID, DATE, DATE) TO authenticated;
