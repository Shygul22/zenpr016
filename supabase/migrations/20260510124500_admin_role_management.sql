-- Function to get admin user IDs
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin';
END;
$$;

-- Function to toggle admin role
CREATE OR REPLACE FUNCTION public.toggle_admin_role(target_user_id UUID, make_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Prevent removing yourself as admin to avoid accidental lockout
  IF NOT make_admin AND target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove your own admin access';
  END IF;

  IF make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin';
  END IF;
END;
$$;
