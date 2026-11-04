-- Add is_admin_reply to course_messages
ALTER TABLE public.course_messages ADD COLUMN IF NOT EXISTS is_admin_reply BOOLEAN NOT NULL DEFAULT false;

-- Update existing messages: if user is admin, set is_admin_reply to true
UPDATE public.course_messages
SET is_admin_reply = true
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);
