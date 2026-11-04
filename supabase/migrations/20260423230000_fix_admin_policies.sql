-- Add missing admin policies for enrollments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can enroll anyone' AND tablename = 'enrollments') THEN
    CREATE POLICY "Admins can enroll anyone" ON public.enrollments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update anyone''s enrollment' AND tablename = 'enrollments') THEN
    CREATE POLICY "Admins can update anyone's enrollment" ON public.enrollments FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete any enrollment' AND tablename = 'enrollments') THEN
    CREATE POLICY "Admins can delete any enrollment" ON public.enrollments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Add missing admin policies for profiles (Admins can already SELECT)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Add missing admin policies for lesson_progress
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all progress' AND tablename = 'lesson_progress') THEN
    CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert progress' AND tablename = 'lesson_progress') THEN
    CREATE POLICY "Admins can insert progress" ON public.lesson_progress FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update any progress' AND tablename = 'lesson_progress') THEN
    CREATE POLICY "Admins can update any progress" ON public.lesson_progress FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete progress' AND tablename = 'lesson_progress') THEN
    CREATE POLICY "Admins can delete progress" ON public.lesson_progress FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
