-- Teqemach Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
--    NOTE: id is now a standalone UUID (no FK to auth.users).
--    Admin profile links to Supabase Auth via matching UUID (set manually).
--    Collector/Contributor profiles have no Supabase Auth entry.
--    email  – used as login credential for collector/contributor
--    password – bcrypt hash for collector/contributor; 'supabase_auth' for admin
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'collector', 'contributor')),
    email TEXT UNIQUE,
    password TEXT,
    collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Equb Groups Table
CREATE TABLE public.equb_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contribution_amount NUMERIC NOT NULL CHECK (contribution_amount > 0),
    total_days INTEGER NOT NULL CHECK (total_days > 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Group Memberships Table (Linking contributors to groups)
CREATE TABLE public.group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.equb_groups(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, contributor_id)
);

-- 4. Contributions Table (Tracking payments per cycle)
CREATE TABLE public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.equb_groups(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
    is_marked_paid BOOLEAN NOT NULL DEFAULT false,
    disbursed BOOLEAN NOT NULL DEFAULT false,
    contribution_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, contributor_id, cycle_number)
);

-- 5. Contribution Rules Table
CREATE TABLE public.contribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_text TEXT NOT NULL CHECK (length(rule_text) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equb_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_rules ENABLE ROW LEVEL SECURITY;

-- Helper security definer functions to inspect current user role without recursion loops
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_collector()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'collector' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
-- NOTE: collector/contributor operations bypass RLS via service_role key on the server.
--       RLS policies here protect against unauthenticated or anon access.

-- Profiles
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Profiles are insertable by admins or self"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles are updateable by admins or self"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles are deleteable by admins"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- Equb Groups
CREATE POLICY "Equb groups are readable by admins, owning collectors, or member contributors"
    ON public.equb_groups FOR SELECT
    TO authenticated
    USING (
        public.is_admin() 
        OR collector_id = auth.uid() 
        OR id IN (SELECT group_id FROM public.group_memberships WHERE contributor_id = auth.uid())
    );

CREATE POLICY "Equb groups are insertable by admins or collectors"
    ON public.equb_groups FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Equb groups are updateable by admins or owning collectors"
    ON public.equb_groups FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()))
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Equb groups are deleteable by admins or owning collectors"
    ON public.equb_groups FOR DELETE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));


-- Group Memberships
CREATE POLICY "Memberships are readable by admins, collectors, or matching contributor"
    ON public.group_memberships FOR SELECT
    TO authenticated
    USING (public.is_admin() OR collector_id = auth.uid() OR contributor_id = auth.uid());

CREATE POLICY "Memberships are insertable by admins or collectors"
    ON public.group_memberships FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Memberships are updateable by admins or collectors"
    ON public.group_memberships FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()))
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Memberships are deleteable by admins or collectors"
    ON public.group_memberships FOR DELETE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));


-- Contributions
CREATE POLICY "Contributions are readable by admins, collectors, or matching contributor"
    ON public.contributions FOR SELECT
    TO authenticated
    USING (public.is_admin() OR collector_id = auth.uid() OR contributor_id = auth.uid());

CREATE POLICY "Contributions are insertable by admins or collectors"
    ON public.contributions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Contributions are updateable by admins or collectors"
    ON public.contributions FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()))
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Contributions are deleteable by admins or collectors"
    ON public.contributions FOR DELETE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));


-- Contribution Rules
CREATE POLICY "Rules are readable by admins, collectors, or contributors of that collector"
    ON public.contribution_rules FOR SELECT
    TO authenticated
    USING (
        public.is_admin() 
        OR collector_id = auth.uid() 
        OR collector_id = (SELECT collector_id FROM public.group_memberships WHERE contributor_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "Rules are insertable by admins or collectors"
    ON public.contribution_rules FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Rules are updateable by admins or collectors"
    ON public.contribution_rules FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()))
    WITH CHECK (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));

CREATE POLICY "Rules are deleteable by admins or collectors"
    ON public.contribution_rules FOR DELETE
    TO authenticated
    USING (public.is_admin() OR (public.is_collector() AND collector_id = auth.uid()));


-- ============================================================
-- MIGRATION SQL (run in Supabase SQL editor for existing DBs)
-- ============================================================
--
-- Step 1: Remove old FK from profiles to auth.users
--   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
--
-- Step 2: Add email + password columns
--   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
--   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
--
-- Step 3: Set default UUID generator on id column
--   ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
--
-- Step 4: Drop the old auth trigger (no longer needed)
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
--
-- Step 5: Update admin profile — replace values with your actual admin email + UUID
--   UPDATE public.profiles
--     SET email = 'admin@yourdomain.com', password = 'supabase_auth'
--     WHERE role = 'admin';
--
-- Step 6: Add collector_id reference to profiles for collector assignment
--   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- ============================================================
