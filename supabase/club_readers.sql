-- =============================================
-- Клуб ішіндегі оқырмандар рейтингі
-- =============================================
-- Ұпай — жалпы жиналған сан, айлық емес. Себебі оқырмандар тізімінде де,
-- профильде де сол сан тұр: адам бір жерде 1240, екінші жерде 180 көрсе
-- шатасады. Ал клубтар арасындағы бәсеке айлық күйінде қалады.

-- Ескі нұсқасы мүшелік тексеретін әрі кезең сұрайтын. Клубтар енді
-- бәріне ашық болғандықтан, ол шектеу керек емес.
DROP FUNCTION IF EXISTS public.club_member_leaderboard(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.club_readers(target_club UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  finished_books BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.avatar_url,
    COALESCE((SELECT SUM(e.points) FROM point_events e WHERE e.user_id = p.id), 0),
    (SELECT COUNT(*) FROM book_trackers t WHERE t.user_id = p.id AND t.is_completed)
  FROM club_members m
  JOIN profiles p ON p.id = m.user_id
  WHERE m.club_id = target_club
    AND auth.uid() IS NOT NULL
  ORDER BY 4 DESC, 5 DESC, p.name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.club_readers(UUID) TO authenticated;
