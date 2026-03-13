
-- Atomic wallet deduction function for purchases
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reference TEXT,
  p_description TEXT,
  p_source TEXT DEFAULT 'cheapdatahub'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Lock the wallet row for update
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance', 'balance', v_balance);
  END IF;

  -- Deduct balance
  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Create transaction record
  INSERT INTO transactions (user_id, wallet_id, type, amount, reference, status, source, description)
  VALUES (p_user_id, v_wallet_id, 'debit', p_amount, p_reference, 'pending', p_source, p_description)
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'wallet_id', v_wallet_id, 'new_balance', v_balance - p_amount);
END;
$$;

-- Function to refund wallet on failed purchase
CREATE OR REPLACE FUNCTION public.refund_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reference TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE wallets SET balance = balance + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE transactions SET status = 'failed', updated_at = NOW()
  WHERE reference = p_reference AND user_id = p_user_id;
END;
$$;

-- Function to mark transaction successful
CREATE OR REPLACE FUNCTION public.complete_transaction(
  p_reference TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE transactions SET status = 'success', metadata = p_metadata, updated_at = NOW()
  WHERE reference = p_reference;
END;
$$;
