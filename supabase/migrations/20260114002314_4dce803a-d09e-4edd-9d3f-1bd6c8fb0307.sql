-- Add virtual account columns to wallets table
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS virtual_account_number TEXT,
ADD COLUMN IF NOT EXISTS virtual_bank_name TEXT,
ADD COLUMN IF NOT EXISTS virtual_account_name TEXT;