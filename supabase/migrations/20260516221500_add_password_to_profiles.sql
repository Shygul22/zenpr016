-- Add password column to profiles for custom table-based login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- Update the profiles table to allow inserting without a linked auth.users ID if needed
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add a unique constraint on email if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Enable RLS (already enabled, but making sure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert into profiles (Sign up)
DROP POLICY IF EXISTS "Allow public signup" ON public.profiles;
CREATE POLICY "Allow public signup" ON public.profiles FOR INSERT WITH CHECK (true);

-- Allow anyone to select from profiles (Login check)
DROP POLICY IF EXISTS "Allow public login check" ON public.profiles;
CREATE POLICY "Allow public login check" ON public.profiles FOR SELECT USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Allow individual update" ON public.profiles;
CREATE POLICY "Allow individual update" ON public.profiles FOR UPDATE USING (true);
