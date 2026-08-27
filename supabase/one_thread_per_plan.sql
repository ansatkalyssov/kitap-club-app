-- =============================================
-- Бір адам — бір талқыға бір пікір
-- =============================================
-- Әр мүше бір кітап бойынша бір-ақ рет пікір ашады, қалғандары соған
-- жауап береді. Бұл ережеде екі пайда бар:
--   1. Талқы беті ретсіз толмайды — жіп саны мүше санынан аспайды
--   2. Әңгіме жанданады — екінші жіп ашу мүмкін емес болғандықтан,
--      адам басқаның жазғанына жауап береді
--
-- Жауаптарға (parent_id IS NOT NULL) қолданылмайды — оларға шек жоқ.

-- Егер бір адамда бір жоспарда бірнеше жіп бар болса, ең ескісін
-- қалдырып, қалғанын өшіреміз (жауаптары каскадпен кетеді).
DELETE FROM public.book_analyses a
WHERE a.parent_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.book_analyses b
    WHERE b.parent_id IS NULL
      AND b.club_plan_id = a.club_plan_id
      AND b.author_id = a.author_id
      AND b.created_at < a.created_at
  );

CREATE UNIQUE INDEX IF NOT EXISTS book_analyses_one_per_plan
  ON public.book_analyses (club_plan_id, author_id)
  WHERE parent_id IS NULL;

-- Пікір ашу рұқсаты бұрыннан клуб мүшелеріне берілген — өзгертудің
-- қажеті жоқ. Тек қолданбадағы рөл шектеуі алынады.
