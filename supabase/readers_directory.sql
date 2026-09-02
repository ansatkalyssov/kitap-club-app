-- =============================================
-- Оқырмандар тізімі
-- =============================================
-- Әр оқырман басқалардың не оқып жатқанын көре алады.
--
-- RLS кеңінен босатылмайды: оның орнына SECURITY DEFINER функциялары
-- тек рұқсат етілген өрістерді қайтарады. Сондықтан жеке ескертпелер
-- (reading_progress.note) мен күнделікті оқу журналы (reading_logs)
-- сұрауға мүлдем кірмейді — кездейсоқ ашылып қалуы мүмкін емес.

-- ---------------------------------------------
-- 1. Барлық оқырман — тізім беті үшін
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION public.readers_directory()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  role TEXT,
  total_points BIGINT,
  finished_books BIGINT,
  active_books BIGINT,
  clubs BIGINT,
  current_book TEXT,
  current_author TEXT,
  current_cover TEXT,
  current_progress INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.avatar_url,
    p.role,
    COALESCE((SELECT SUM(e.points) FROM point_events e WHERE e.user_id = p.id), 0),
    (SELECT COUNT(*) FROM book_trackers t WHERE t.user_id = p.id AND t.is_completed),
    (SELECT COUNT(*) FROM book_trackers t WHERE t.user_id = p.id AND NOT t.is_completed),
    (SELECT COUNT(*) FROM club_members m WHERE m.user_id = p.id),
    cur.book_title,
    cur.book_author,
    COALESCE(cur.cover_url, cur_book.cover_url),
    CASE
      WHEN cur.total_pages > 0
      THEN LEAST(100, ROUND(cur.current_page::NUMERIC * 100 / cur.total_pages))::INTEGER
      ELSE NULL
    END
  FROM profiles p
  -- Ағымдағы кітап: аяқталмағандардың ішінен дедлайны ең жақыны
  LEFT JOIN LATERAL (
    SELECT t.book_title, t.book_author, t.cover_url, t.current_page,
           t.total_pages, t.club_plan_id
    FROM book_trackers t
    WHERE t.user_id = p.id AND NOT t.is_completed
    ORDER BY t.deadline NULLS LAST, t.created_at DESC
    LIMIT 1
  ) cur ON true
  LEFT JOIN club_plans cp ON cp.id = cur.club_plan_id
  LEFT JOIN books cur_book ON cur_book.id = cp.book_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY 5 DESC, p.name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.readers_directory() TO authenticated;

-- ---------------------------------------------
-- 2. Бір оқырманның сөресі — жеке беті үшін
-- ---------------------------------------------
-- Тек кітаптың өзі туралы дерек: аты, авторы, мұқабасы, пайызы.
-- Күнделікті прогресс жазбалары мен ескертпелер қайтарылмайды.

CREATE OR REPLACE FUNCTION public.reader_books(target UUID)
RETURNS TABLE (
  tracker_id UUID,
  book_title TEXT,
  book_author TEXT,
  cover_url TEXT,
  total_pages INTEGER,
  current_page INTEGER,
  progress INTEGER,
  is_completed BOOLEAN,
  deadline DATE,
  club_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.book_title,
    t.book_author,
    COALESCE(t.cover_url, b.cover_url),
    t.total_pages,
    t.current_page,
    CASE
      WHEN t.total_pages > 0
      THEN LEAST(100, ROUND(t.current_page::NUMERIC * 100 / t.total_pages))::INTEGER
      ELSE 0
    END,
    t.is_completed,
    t.deadline,
    c.name
  FROM book_trackers t
  LEFT JOIN club_plans cp ON cp.id = t.club_plan_id
  LEFT JOIN books b ON b.id = cp.book_id
  LEFT JOIN clubs c ON c.id = cp.club_id
  WHERE t.user_id = target
    AND auth.uid() IS NOT NULL
  ORDER BY t.is_completed, t.deadline NULLS LAST, t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.reader_books(UUID) TO authenticated;
