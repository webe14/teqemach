-- Migration: Add payment_transactions table for tracking and duplicate prevention
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    group_id UUID NOT NULL REFERENCES public.equb_groups(id) ON DELETE CASCADE,
    txn_ref TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    cycles_paid INTEGER NOT NULL DEFAULT 1,
    cycle_numbers INTEGER[] DEFAULT '{}',
    payment_method TEXT DEFAULT 'CBE_TRANSFER',
    bank_type TEXT DEFAULT 'CBE',
    raw_sms TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_payment_transactions_txn_ref ON public.payment_transactions(txn_ref);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_contributor_id ON public.payment_transactions(contributor_id);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment transactions are readable by authenticated users"
    ON public.payment_transactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Payment transactions are insertable by admins, collectors, or self"
    ON public.payment_transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = contributor_id OR public.is_admin() OR public.is_collector());
