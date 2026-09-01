-- =============================================
-- Web push жазылымдары
-- =============================================
-- Бір қолданушыда бірнеше жазылым болуы мүмкін (телефон, компьютер).
-- Кілт — endpoint, ол әр браузер-құрылғы жұбына бірегей.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Жазуды тек сервер service_role кілтімен істейді (api/push-subscribe),
-- сондықтан клиентке тек өз жазылымын оқу рұқсаты жеткілікті.
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
