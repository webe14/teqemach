-- ============================================================
-- Performance Composite Indexes for Fast Lookups and Reports
-- ============================================================

-- 1. Fast lookup for cycle grid and payment status checks
CREATE INDEX IF NOT EXISTS idx_contributions_active_lookup 
ON public.contributions(contributor_id, group_id, is_marked_paid, cycle_number);

-- 2. Fast lookup for collector reports and daily paid counts
CREATE INDEX IF NOT EXISTS idx_contributions_collector_paid 
ON public.contributions(collector_id, is_marked_paid, contribution_date DESC);

-- 3. Fast group membership lookup
CREATE INDEX IF NOT EXISTS idx_group_memberships_composite 
ON public.group_memberships(contributor_id, group_id, collector_id);

-- 4. Fast profile query by collector and status
CREATE INDEX IF NOT EXISTS idx_profiles_collector_status 
ON public.profiles(collector_id, role, status);

-- 5. Fast lookup for pending SMS queue processing
CREATE INDEX IF NOT EXISTS idx_sms_jobs_pending 
ON public.sms_jobs(status, created_at ASC);

-- 6. Telegram user phone number lookup
CREATE INDEX IF NOT EXISTS idx_telegram_users_phone_user 
ON public.telegram_users(phone_number, user_id);
