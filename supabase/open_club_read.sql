-- =============================================
-- Клуб мазмұнын оқуға ашу
-- =============================================
-- Тіркелген кез келген қолданушы клубтың жоспарын, талқыларын және
-- оқырмандарын көре алады. Мақсаты — клубқа қосылмай тұрып ішінде не
-- болып жатқанын көру, сол арқылы қосылуға ынталандыру.
--
-- ЖАЗУ рұқсаты өзгермейді: пікір жазу, жауап беру, клубқа қосылу —
-- бәрі бұрынғыдай тек мүшелер мен жүргізушіге ашық.

-- Пікірлер: оқу — бәріне
DROP POLICY IF EXISTS "Club members can view analyses" ON public.book_analyses;

CREATE POLICY "Anyone can view analyses"
  ON public.book_analyses
  FOR SELECT
  USING (true);

-- Клуб мүшелігі: кім қай клубта екені көрінеді
DROP POLICY IF EXISTS "Members can view club memberships" ON public.club_members;

CREATE POLICY "Anyone can view club memberships"
  ON public.club_members
  FOR SELECT
  USING (true);
