-- Create course_messages table for real-time chat with explicit profile relationship
CREATE TABLE IF NOT EXISTS public.course_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add explicit foreign key to profiles to enable selective joins in PostgREST
-- Use public.profiles(user_id) because that is what contains the auth.uid()
ALTER TABLE public.course_messages 
DROP CONSTRAINT IF EXISTS course_messages_profile_fkey;

ALTER TABLE public.course_messages
ADD CONSTRAINT course_messages_profile_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;

-- Policies for course_messages
DROP POLICY IF EXISTS "Users can view course messages if enrolled" ON public.course_messages;
CREATE POLICY "Users can view course messages if enrolled" ON public.course_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE course_id = course_messages.course_id AND user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can insert course messages if enrolled" ON public.course_messages;
CREATE POLICY "Users can insert course messages if enrolled" ON public.course_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE course_id = course_id AND user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete messages" ON public.course_messages;
CREATE POLICY "Admins can delete messages" ON public.course_messages
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_course_messages_course_id ON public.course_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_created_at ON public.course_messages(created_at);

-- Enable Realtime
-- Note: You may need to run this separately if the publication already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_messages;
  END IF;
END $$;
