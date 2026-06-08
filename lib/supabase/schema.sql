-- Apex Database Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor to set up your database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, normalized_name)
);

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subjects" ON public.user_subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON public.user_subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.user_subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON public.user_subjects FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- SCHEDULE BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own schedule blocks" ON public.schedule_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule blocks" ON public.schedule_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule blocks" ON public.schedule_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule blocks" ON public.schedule_blocks FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TOPICS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  subtopics JSONB DEFAULT '[]'::jsonb,
  strength INTEGER NOT NULL DEFAULT 5 CHECK (strength BETWEEN 1 AND 10),
  confidence INTEGER NOT NULL DEFAULT 5 CHECK (confidence BETWEEN 1 AND 10),
  last_revised TEXT NOT NULL,
  questions_practiced INTEGER NOT NULL DEFAULT 0,
  accuracy INTEGER NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 100),
  notes TEXT DEFAULT '',
  doubts JSONB DEFAULT '[]'::jsonb,
  class_covered BOOLEAN DEFAULT false,
  revision_needed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CLASS NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  summary TEXT NOT NULL DEFAULT '',
  doubts JSONB DEFAULT '[]'::jsonb,
  understood BOOLEAN DEFAULT true,
  needs_revision BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  file_metadata JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.class_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.class_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.class_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.class_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.class_notes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- GYM SESSIONS (flexible type - any split)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  exercises JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT false,
  duration INTEGER,
  bodyweight NUMERIC(5,1),
  notes TEXT DEFAULT '',
  cardio_distance NUMERIC(4,1),
  cardio_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gym_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own gym sessions" ON public.gym_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gym sessions" ON public.gym_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gym sessions" ON public.gym_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gym sessions" ON public.gym_sessions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STRENGTH HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.strength_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  exercise TEXT NOT NULL,
  weight NUMERIC(6,1) NOT NULL,
  reps INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strength_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own strength history" ON public.strength_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strength history" ON public.strength_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strength history" ON public.strength_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strength history" ON public.strength_history FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- HABITS (with start_date)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'routine',
  icon TEXT,
  target_days JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  active BOOLEAN DEFAULT true,
  start_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- HABIT LOGS (unique constraint on habit_id + date)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL,
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  value NUMERIC,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own habit logs" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit logs" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit logs" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- DAILY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  study_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  gym_completed BOOLEAN DEFAULT false,
  habits_completed JSONB DEFAULT '[]'::jsonb,
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  energy INTEGER CHECK (energy BETWEEN 1 AND 10),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily logs" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily logs" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily logs" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily logs" ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AI SUGGESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  message TEXT NOT NULL,
  action TEXT,
  date TEXT NOT NULL,
  dismissed BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai suggestions" ON public.ai_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai suggestions" ON public.ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai suggestions" ON public.ai_suggestions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai suggestions" ON public.ai_suggestions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_subjects_user ON public.user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_user_norm ON public.user_subjects(user_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_user_date ON public.schedule_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_topics_user_subject ON public.topics(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON public.topics(user_id);
CREATE INDEX IF NOT EXISTS idx_class_notes_user_date ON public.class_notes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_class_notes_user_subject ON public.class_notes(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_user_date ON public.gym_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_strength_history_user_date ON public.strength_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_strength_history_user_exercise ON public.strength_history(user_id, exercise);
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_date ON public.ai_suggestions(user_id, date);
