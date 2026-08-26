-- =============================================
-- Карточкалар тізімі
-- =============================================
-- Қайта орындауға болады — ON CONFLICT арқылы қорғалған.
--
-- art_url бос қалдырылған: дизайнер портреттерді дайындағанша
-- карточканың суреті code-тен есептелетін қазақ оюы болып көрсетіледі.
-- Портрет дайын болғанда осы бағанды толтыру жеткілікті, кодта
-- ештеңе өзгертудің қажеті жоқ.
--
-- Дереккөздер: Абай мен батырлар жыры — қоғамдық игілік.
-- Заманауи шығармалардың кейіпкерлері тек аталады, дәйексөз алынбаған.

INSERT INTO public.cards
  (code, name, book_title, author, quote, rarity, unlock_type, threshold, sort_order)
VALUES
  ('kozha',      'Қожа',       'Менің атым Қожа',  'Бердібек Соқпақбаев', NULL,
   'common',    'starter',   NULL,  1),

  ('togzhan',    'Тоғжан',     'Абай жолы',        'Мұхтар Әуезов',       NULL,
   'rare',      'threshold',  500,  2),

  ('kobylandy',  'Қобыланды',  'Қобыланды батыр',  'Батырлар жыры',       'Тайбурыл шапса жер тартып',
   'epic',      'threshold', 1500,  3),

  ('ulpan',      'Ұлпан',      'Ұлпан',            'Ғабит Мүсірепов',     NULL,
   'rare',      'threshold', 3000,  4),

  ('abai',       'Абай',       'Абай жолы',        'Мұхтар Әуезов',       'Адам болам десеңіз',
   'legendary', 'threshold', 5000,  5),

  ('kyz_zhibek', 'Қыз Жібек',  'Қыз Жібек',        'Халық жыры',          NULL,
   'epic',      'threshold', 8000,  6),

  ('botagoz',    'Ботагөз',    'Ботагөз',          'Сәбит Мұқанов',       NULL,
   'rare',      'threshold', 12000, 7),

  ('alpamys',    'Алпамыс',    'Алпамыс батыр',    'Батырлар жыры',       NULL,
   'epic',      'threshold', 17000, 8),

  ('aldar_kose', 'Алдар Көсе', 'Қазақ ертегілері', 'Халық ауыз әдебиеті', NULL,
   'legendary', 'threshold', 23000, 9)

ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  book_title  = EXCLUDED.book_title,
  author      = EXCLUDED.author,
  quote       = EXCLUDED.quote,
  rarity      = EXCLUDED.rarity,
  unlock_type = EXCLUDED.unlock_type,
  threshold   = EXCLUDED.threshold,
  sort_order  = EXCLUDED.sort_order;
