import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || Deno.env.get('LIVE_SECRET_KEY');

    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { amount, bank_account_id, reason } = await req.json();

    if (!amount || amount < 100) {
      throw new Error('Amount must be at least ₦100');
    }

    if (!bank_account_id) {
      throw new Error('Bank account is required');
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.is_locked) {
      throw new Error('Wallet is locked. Please contact support.');
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Get bank account
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('user_id', user.id)
      .single();

    if (bankError || !bankAccount) {
      throw new Error('Bank account not found');
    }

    // Create or get transfer recipient
    let recipientCode = bankAccount.recipient_code;

    if (!recipientCode) {
      console.log('Creating transfer recipient...');
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: bankAccount.account_name,
          account_number: bankAccount.account_number,
          bank_code: bankAccount.bank_code,
          currency: 'NGN',
        }),
      });

      const recipientData = await recipientResponse.json();
      console.log('Recipient response:', recipientData);

      if (!recipientData.status) {
        throw new Error(recipientData.message || 'Failed to create transfer recipient');
      }

      recipientCode = recipientData.data.recipient_code;

      // Save recipient code
      await supabase
        .from('bank_accounts')
        .update({ recipient_code: recipientCode })
        .eq('id', bank_account_id);
    }

    const reference = `YOMI_WD_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log('Initiating transfer:', { amount, recipientCode, reference });

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: reason || 'Wallet withdrawal',
        reference,
      }),
    });

    const transferData = await transferResponse.json();
    console.log('Transfer response:', transferData);

    if (!transferData.status) {
      throw new Error(transferData.message || 'Failed to initiate transfer');
    }

    // Deduct from wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - amount })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw new Error('Failed to update wallet balance');
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'debit',
        amount,
        reference,
        status: transferData.data.status === 'success' ? 'success' : 'pending',
        source: 'paystack',
        description: `Withdrawal to ${bankAccount.bank_name} - ${bankAccount.account_number}`,
        metadata: { 
          paystack_data: transferData.data,
          bank_account_id,
        }
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        reference,
        status: transferData.data.status,
        amount,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error processing withdrawal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
