-- =======================================================
-- CONSOLIDATED SCHEMA (BULLETPROOF / PERMISSIVE RLS POLICIES / SEEDED ADMIN ACCOUNT)
-- =======================================================

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.course_messages CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.course_requests CASCADE;
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create settings table for global configuration
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  auto_approve_users BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default global settings
INSERT INTO public.settings (id, auto_approve_users) VALUES ('global', false);

-- Drop existing enums and functions if they exist
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_user_ids CASCADE;
DROP FUNCTION IF EXISTS public.toggle_admin_role CASCADE;

-- 1. Create app_role enum for TypeScript compatibility
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create profiles table (completely independent of auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  phone TEXT NULL,
  password TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- 4. Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  description TEXT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 7. Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE (user_id, lesson_id)
);

-- 8. Create course_requests table
CREATE TABLE public.course_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 9. Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NULL REFERENCES public.courses(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_method TEXT NOT NULL DEFAULT 'Manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create course_messages table for integrated chat support
CREATE TABLE public.course_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reply_to_id UUID NULL REFERENCES public.course_messages(id) ON DELETE SET NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false
);

-- =======================================================
-- BULLETPROOF / FULLY PERMISSIVE RLS CONFIGURATION
-- =======================================================

-- Enable RLS on all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;

-- Create highly permissive policies on all tables allowing all SELECT, INSERT, UPDATE, DELETE actions
DROP POLICY IF EXISTS permissive ON public.settings;
CREATE POLICY permissive ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.profiles;
CREATE POLICY permissive ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.user_roles;
CREATE POLICY permissive ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.courses;
CREATE POLICY permissive ON public.courses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.lessons;
CREATE POLICY permissive ON public.lessons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.enrollments;
CREATE POLICY permissive ON public.enrollments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.lesson_progress;
CREATE POLICY permissive ON public.lesson_progress FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.course_requests;
CREATE POLICY permissive ON public.course_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.payments;
CREATE POLICY permissive ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive ON public.course_messages;
CREATE POLICY permissive ON public.course_messages FOR ALL USING (true) WITH CHECK (true);

-- =======================================================
-- FUNCTIONS & PROCEDURES
-- =======================================================

-- has_role function for checking access permissions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- check_is_admin function for checking if current user is admin safely
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  );
$$;

-- get_admin_user_ids function to list admin user IDs
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin';
END;
$$;

-- toggle_admin_role function for role management
CREATE OR REPLACE FUNCTION public.toggle_admin_role(target_user_id UUID, make_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin';
  END IF;
END;
$$;

-- Trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =======================================================
-- HIGH PERFORMANCE INDEXES
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(course_id, "order");
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_user_id ON public.course_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_course_id ON public.course_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_created_at ON public.course_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_course_messages_reply_to_id ON public.course_messages(reply_to_id);

-- Enable Realtime safely without risking transaction abort
DO $$ 
BEGIN
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'course_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.course_messages;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not configure Realtime publication. Continuing...';
  END;
END $$;

-- =======================================================
-- DEFAULT SEED DATA (ADMIN USER CREATION)
-- =======================================================
INSERT INTO public.profiles (id, user_id, name, email, password, status)
VALUES (
  'd3b07384-d113-4956-a5e2-aa50f142d633',
  'd3b07384-d113-4956-a5e2-aa50f142d633',
  'Administrator',
  'admin@admin.com',
  'admin123',
  'approved'
)
ON CONFLICT (email) DO UPDATE
SET password = EXCLUDED.password,
    status = 'approved';

INSERT INTO public.user_roles (user_id, role)
VALUES (
  'd3b07384-d113-4956-a5e2-aa50f142d633',
  'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;
