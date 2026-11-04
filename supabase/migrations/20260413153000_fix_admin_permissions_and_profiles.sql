-- Add rejection_reason to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add RLS policy for admins to update profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" 
        ON public.profiles 
        FOR UPDATE 
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
