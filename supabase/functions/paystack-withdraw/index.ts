import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  console.log('=== paystack-withdraw: Request received ===');
  console.log('Method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || Deno.env.get('LIVE_SECRET_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasPaystackKey: !!paystackSecretKey,
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Support both bankAccountId and bank_account_id
    const amount = body.amount;
    const bankAccountId = body.bankAccountId || body.bank_account_id;
    const reason = body.reason;

    if (!amount || typeof amount !== 'number' || amount < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Amount must be at least ₦100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bankAccountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bank account is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet error:', walletError);
      throw new Error('Wallet not found');
    }

    if (wallet.is_locked) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet is locked. Please contact support.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((wallet.balance || 0) < amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bank account
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('user_id', user.id)
      .single();

    if (bankError || !bankAccount) {
      console.error('Bank account error:', bankError);
      return new Response(
        JSON.stringify({ success: false, error: 'Bank account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        return new Response(
          JSON.stringify({ success: false, error: recipientData.message || 'Failed to create transfer recipient' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recipientCode = recipientData.data.recipient_code;

      // Save recipient code
      await supabase
        .from('bank_accounts')
        .update({ recipient_code: recipientCode })
        .eq('id', bankAccountId);
    }

    const reference = `YOMI_WD_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
        amount: Math.round(amount * 100), // Convert to kobo
        recipient: recipientCode,
        reason: reason || 'Wallet withdrawal',
        reference,
      }),
    });

    const transferData = await transferResponse.json();
    console.log('Transfer response:', transferData);

    if (!transferData.status) {
      return new Response(
        JSON.stringify({ success: false, error: transferData.message || 'Failed to initiate transfer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: (wallet.balance || 0) - amount })
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
          bank_account_id: bankAccountId,
        }
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
    }

    console.log('Withdrawal initiated:', reference);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reference,
          status: transferData.data.status,
          amount,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('=== paystack-withdraw: Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
