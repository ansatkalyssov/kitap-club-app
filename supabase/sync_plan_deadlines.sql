-- Клуб трекерлеріндегі ескі дедлайндарды жоспармен сәйкестендіру.
--
-- Жүргізуші жоспарды өзгерткенде трекерлер тек «Аяқталуы» (end_date)
-- бойынша жаңаратын. Жоспарда тек «Талқы күні» (meeting_date) болса,
-- күн жылжыса да, оқырманның трекерінде ескі күн қалып қоятын. Код
-- түзетілді, бірақ бұрын қалып қойған трекерлер өзінен түзелмейді —
-- жүргізуші жоспарды қайта сақтағанда ғана түзеледі.
--
-- Ереже кодтағыдай: end_date, ол бос болса meeting_date. Тек аяқталмаған
-- трекерлер өзгереді.
--
-- Ескерту: оқырман өз трекеріндегі күнді қолмен өзгерткен болса, ол да
-- жоспардың күніне қайтады. Жүргізуші жоспарды сақтағанда да солай болады.

-- 1. Алдымен қарап шығыңыз: қай трекер, қандай күннен қандай күнге
select
  c.name as club,
  t.book_title,
  p.name as reader,
  t.deadline as old_deadline,
  coalesce(cp.end_date, cp.meeting_date) as new_deadline
from book_trackers t
join club_plans cp on cp.id = t.club_plan_id
join clubs c on c.id = cp.club_id
join profiles p on p.id = t.user_id
where not t.is_completed
  and coalesce(cp.end_date, cp.meeting_date) is not null
  and t.deadline is distinct from coalesce(cp.end_date, cp.meeting_date)
order by c.name, t.book_title, p.name;

-- 2. Тізім дұрыс болса — жаңарту
update book_trackers t
set deadline = coalesce(cp.end_date, cp.meeting_date)
from club_plans cp
where cp.id = t.club_plan_id
  and not t.is_completed
  and coalesce(cp.end_date, cp.meeting_date) is not null
  and t.deadline is distinct from coalesce(cp.end_date, cp.meeting_date);
