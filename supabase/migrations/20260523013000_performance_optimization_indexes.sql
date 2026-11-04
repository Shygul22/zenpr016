-- Performance Optimization Indexes
-- This migration adds crucial indexes to key foreign keys and heavily queried columns
-- to transition PostgreSQL queries from slow sequential full-table scans to rapid index seeks.

-- 1. Index on profiles(user_id) - Profile retrieval happens on every single request
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 2. Index on profiles(email) - Used frequently in authentication and search
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Index on user_roles(user_id) - Essential for has_role() checks in RLS policies
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 4. Index on payments(user_id) - Speeds up student invoice/payment history queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- 5. Index on course_requests(user_id) - Speeds up course approval queries
CREATE INDEX IF NOT EXISTS idx_course_requests_user_id ON public.course_requests(user_id);

-- 6. Composite Index on lesson_progress(user_id, lesson_id) - Optimizes lesson completion checks
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);
