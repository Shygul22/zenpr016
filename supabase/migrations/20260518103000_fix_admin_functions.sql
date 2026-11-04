-- Update admin verification functions to resolve auth.uid() to public.profiles(id)
-- This supports administrative role validations when profiles have non-matching auth IDs (due to custom-then-standard auth merging)

-- 1. Redefine get_admin_user_ids function
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin (resolving auth.uid() to profiles.id)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE (p.user_id = auth.uid() OR p.id = auth.uid()) AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin';
END;
$$;


-- 2. Redefine toggle_admin_role function
CREATE OR REPLACE FUNCTION public.toggle_admin_role(target_user_id UUID, make_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin (resolving auth.uid() to profiles.id)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE (p.user_id = auth.uid() OR p.id = auth.uid()) AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Prevent removing yourself as admin to avoid accidental lockout
  IF NOT make_admin AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_user_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Cannot remove your own admin access';
  END IF;

  IF make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin';
  END IF;
END;
$$;
