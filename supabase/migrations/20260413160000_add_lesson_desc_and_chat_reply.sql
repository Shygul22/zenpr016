-- Add description to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Add reply_to_id to course_messages
ALTER TABLE public.course_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.course_messages(id) ON DELETE SET NULL;

-- Index for reply performance
CREATE INDEX IF NOT EXISTS idx_course_messages_reply_to_id ON public.course_messages(reply_to_id);
