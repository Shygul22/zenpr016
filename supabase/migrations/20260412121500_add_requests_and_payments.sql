-- 1. Create course_requests table
CREATE TABLE IF NOT EXISTS public.course_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- Add explicit relationship to profiles for PostgREST join support
ALTER TABLE public.course_requests 
DROP CONSTRAINT IF EXISTS course_requests_profile_fkey;

ALTER TABLE public.course_requests
ADD CONSTRAINT course_requests_profile_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NULL REFERENCES public.courses(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_method TEXT NOT NULL DEFAULT 'Manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add explicit relationship to profiles for PostgREST join support
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_profile_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_profile_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3. Add status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- 4. Add price to courses if missing
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0;

-- 5. Enable RLS
ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 6. Policies for course_requests
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own requests') THEN
    CREATE POLICY "Users can view own requests" ON public.course_requests FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own requests') THEN
    CREATE POLICY "Users can insert own requests" ON public.course_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all requests') THEN
    CREATE POLICY "Admins can view all requests" ON public.course_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update requests') THEN
    CREATE POLICY "Admins can update requests" ON public.course_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 7. Policies for payments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own payments') THEN
    CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all payments') THEN
    CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert payments') THEN
    CREATE POLICY "Admins can insert payments" ON public.payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
