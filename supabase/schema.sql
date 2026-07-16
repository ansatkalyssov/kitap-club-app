-- =============================================
-- Кітап Клубы - Database Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cities (Қалалар)
CREATE TABLE public.cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO public.cities (name) VALUES
  ('Алматы'), ('Астана'), ('Шымкент'), ('Қарағанды'),
  ('Ақтөбе'), ('Тараз'), ('Павлодар'), ('Өскемен'),
  ('Семей'), ('Атырау'), ('Қостанай'), ('Петропавл'),
  ('Орал'), ('Теміртау'), ('Түркістан'), ('Екібастұз'),
  ('Рудный'), ('Жезқазған'), ('Балқаш'), ('Қызылорда');

-- User profiles (Пайдаланушы профилі)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('admin', 'facilitator', 'reader')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clubs (Клубтар)
CREATE TABLE public.clubs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  city_id INTEGER REFERENCES public.cities(id),
  emblem_url TEXT,
  facilitator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club members (Клуб мүшелері)
CREATE TABLE public.club_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Books (Кітаптар)
CREATE TABLE public.books (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  page_count INTEGER,
  cover_url TEXT,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club monthly plans (Клуб жоспары)
CREATE TABLE public.club_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  meeting_date DATE,
  meeting_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, month, year)
);

-- Book trackers (Кітап трекері)
CREATE TABLE public.book_trackers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id),
  club_plan_id UUID REFERENCES public.club_plans(id),
  book_title TEXT NOT NULL,
  book_author TEXT,
  total_pages INTEGER NOT NULL,
  current_page INTEGER DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  deadline DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reading progress (Күнделікті оқу)
CREATE TABLE public.reading_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tracker_id UUID REFERENCES public.book_trackers(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  pages_read INTEGER NOT NULL CHECK (pages_read > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tracker_id, date)
);

-- Personal reading goals (Жеке оқу жоспары)
CREATE TABLE public.reading_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('time', 'pages')),
  daily_minutes INTEGER,
  daily_pages INTEGER,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '20:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reading logs (Күнделікті оқу журналы)
CREATE TABLE public.reading_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  minutes_read INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Book analyses (Кітап анализі)
CREATE TABLE public.book_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES public.book_analyses(id) ON DELETE CASCADE, -- NULL = thread, non-NULL = reply
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  club_plan_id UUID REFERENCES public.club_plans(id),
  author_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  content TEXT,
  key_insights TEXT[],
  meeting_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Clubs policies
CREATE POLICY "Anyone can view active clubs" ON public.clubs FOR SELECT USING (is_active = true);
CREATE POLICY "Facilitators can create clubs" ON public.clubs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('facilitator', 'admin'))
);
CREATE POLICY "Facilitators can update own clubs" ON public.clubs FOR UPDATE USING (
  facilitator_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Club members policies
CREATE POLICY "Members can view club memberships" ON public.club_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND facilitator_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can join clubs" ON public.club_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave clubs" ON public.club_members FOR DELETE USING (user_id = auth.uid());

-- Books policies
CREATE POLICY "Anyone can view books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Facilitators can add books" ON public.books FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('facilitator', 'admin'))
);

-- Club plans policies
CREATE POLICY "Club members can view plans" ON public.club_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = club_plans.club_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_plans.club_id AND facilitator_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Facilitators can manage plans" ON public.club_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND facilitator_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Facilitators can update plans" ON public.club_plans FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND facilitator_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Book trackers policies
CREATE POLICY "Users can view own trackers" ON public.book_trackers FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.club_members cm
    JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.user_id = book_trackers.user_id
    AND c.facilitator_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create own trackers" ON public.book_trackers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trackers" ON public.book_trackers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own trackers" ON public.book_trackers FOR DELETE USING (user_id = auth.uid());

-- Reading progress policies
CREATE POLICY "Users can view own progress" ON public.reading_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.book_trackers WHERE id = tracker_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can log own progress" ON public.reading_progress FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.book_trackers WHERE id = tracker_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own progress" ON public.reading_progress FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.book_trackers WHERE id = tracker_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own progress" ON public.reading_progress FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.book_trackers WHERE id = tracker_id AND user_id = auth.uid())
);

-- Analyses policies
CREATE POLICY "Club members can view analyses" ON public.book_analyses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = book_analyses.club_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.clubs WHERE id = book_analyses.club_id AND facilitator_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Club members can create analyses" ON public.book_analyses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = book_analyses.club_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND facilitator_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Facilitators can update analyses" ON public.book_analyses FOR UPDATE USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Reading goals policies
CREATE POLICY "Users can view own reading goal" ON public.reading_goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own reading goal" ON public.reading_goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reading goal" ON public.reading_goals FOR UPDATE USING (user_id = auth.uid());

-- Reading logs policies
CREATE POLICY "Users can view own reading logs" ON public.reading_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own reading logs" ON public.reading_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reading logs" ON public.reading_logs FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- Helper Functions
-- =============================================

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'reader')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update tracker current_page when progress is logged
CREATE OR REPLACE FUNCTION public.update_tracker_on_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_progress INTEGER;
  total_pages INTEGER;
BEGIN
  SELECT COALESCE(SUM(pages_read), 0) INTO total_progress
  FROM public.reading_progress
  WHERE tracker_id = NEW.tracker_id;

  SELECT bt.total_pages INTO total_pages
  FROM public.book_trackers bt
  WHERE bt.id = NEW.tracker_id;

  UPDATE public.book_trackers
  SET
    current_page = LEAST(total_progress, total_pages),
    is_completed = (total_progress >= total_pages)
  WHERE id = NEW.tracker_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_progress_logged
  AFTER INSERT OR UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_tracker_on_progress();
