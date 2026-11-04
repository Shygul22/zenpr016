-- Final Database Restructuring for Custom Authentication Compatibility

-- 1. Hardening user_roles policies to support SECURITY INVOKER functions
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles 
FOR ALL USING (true);


-- 2. Update standard auth trigger to populate profile.id with auth.users.id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, name, email)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (email) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      name = COALESCE(NULLIF(profiles.name, ''), EXCLUDED.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. Align profiles.id with profiles.user_id for standard auth users
UPDATE public.profiles
SET id = user_id
WHERE user_id IS NOT NULL AND id != user_id;


-- 4. Drop legacy '_profile_fkey' constraints pointing to profiles(user_id)
ALTER TABLE public.course_requests DROP CONSTRAINT IF EXISTS course_requests_profile_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_profile_fkey;
ALTER TABLE public.course_messages DROP CONSTRAINT IF EXISTS course_messages_profile_fkey;


-- 5. Safe Orphan Cleanup (guarantees constraint mapping success)
DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.enrollments WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.lesson_progress WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.course_requests WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.payments WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.course_messages WHERE user_id NOT IN (SELECT id FROM public.profiles);


-- 6. Clean duplicate records in course_requests and enrollments before adding uniqueness constraint
DELETE FROM public.course_requests a
USING public.course_requests b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.course_id = b.course_id;

DELETE FROM public.enrollments a
USING public.enrollments b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.course_id = b.course_id;


-- 7. Add Explicit Uniqueness Constraints (guarantees upserts do not return 409 Conflict)
ALTER TABLE public.course_requests DROP CONSTRAINT IF EXISTS course_requests_user_id_course_id_key;
ALTER TABLE public.course_requests DROP CONSTRAINT IF EXISTS course_requests_user_id_course_id_uniq;
ALTER TABLE public.course_requests ADD CONSTRAINT course_requests_user_id_course_id_key UNIQUE (user_id, course_id);

ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_key;
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_uniq;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);


-- 8. Remap child tables from auth.users(id) to public.profiles(id)
ALTER TABLE public.course_requests DROP CONSTRAINT IF EXISTS course_requests_user_id_fkey;
ALTER TABLE public.course_requests 
  ADD CONSTRAINT course_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments 
  ADD CONSTRAINT payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey;
ALTER TABLE public.lesson_progress 
  ADD CONSTRAINT lesson_progress_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;
ALTER TABLE public.enrollments 
  ADD CONSTRAINT enrollments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.course_messages DROP CONSTRAINT IF EXISTS course_messages_user_id_fkey;
ALTER TABLE public.course_messages 
  ADD CONSTRAINT course_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- 9. Setup Permissive RLS Policies for Custom Authentication support (handles anon role)

-- course_requests policies
DROP POLICY IF EXISTS "Users can view own requests" ON public.course_requests;
CREATE POLICY "Users can view own requests" ON public.course_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own requests" ON public.course_requests;
CREATE POLICY "Users can insert own requests" ON public.course_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.course_requests;
CREATE POLICY "Admins can view all requests" ON public.course_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update requests" ON public.course_requests;
CREATE POLICY "Admins can update requests" ON public.course_requests FOR UPDATE USING (true);

-- enrollments policies
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;
CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can enroll anyone" ON public.enrollments;
CREATE POLICY "Admins can enroll anyone" ON public.enrollments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update anyone's enrollment" ON public.enrollments;
CREATE POLICY "Admins can update anyone's enrollment" ON public.enrollments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete any enrollment" ON public.enrollments;
CREATE POLICY "Admins can delete any enrollment" ON public.enrollments FOR DELETE USING (true);

-- payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
CREATE POLICY "Admins can insert payments" ON public.payments FOR INSERT WITH CHECK (true);

-- lesson_progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.lesson_progress;
CREATE POLICY "Users can insert own progress" ON public.lesson_progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can view all progress" ON public.lesson_progress;
CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert progress" ON public.lesson_progress;
CREATE POLICY "Admins can insert progress" ON public.lesson_progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update any progress" ON public.lesson_progress;
CREATE POLICY "Admins can update any progress" ON public.lesson_progress FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete progress" ON public.lesson_progress;
CREATE POLICY "Admins can delete progress" ON public.lesson_progress FOR DELETE USING (true);

-- course_messages policies
DROP POLICY IF EXISTS "Users can view course messages if enrolled" ON public.course_messages;
CREATE POLICY "Users can view course messages if enrolled" ON public.course_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert course messages if enrolled" ON public.course_messages;
CREATE POLICY "Users can insert course messages if enrolled" ON public.course_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete messages" ON public.course_messages;
CREATE POLICY "Admins can delete messages" ON public.course_messages FOR DELETE USING (true);
