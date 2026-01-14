import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  console.log('=== paystack-verify: Request received ===');
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

    const { reference } = body;

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying Paystack transaction:', reference);

    // Call Paystack verify API
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const paystackData = await paystackResponse.json();
    console.log('Paystack verify response:', paystackData);

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ success: false, error: paystackData.message || 'Failed to verify transaction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paystackData.data.status !== 'success') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Transaction not successful',
          status: paystackData.data.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Check if transaction already exists (idempotency)
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .single();

    if (existingTx) {
      console.log('Transaction already processed:', reference);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transaction already processed',
          data: { amount: paystackData.data.amount / 100 }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountInNaira = paystackData.data.amount / 100;

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'credit',
        amount: amountInNaira,
        reference,
        status: 'success',
        source: 'paystack',
        description: 'Wallet funding via Paystack',
        metadata: { paystack_data: paystackData.data }
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
      throw new Error('Failed to record transaction');
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: (wallet.balance || 0) + amountInNaira })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw new Error('Failed to update wallet balance');
    }

    console.log('Transaction verified and wallet updated:', { amount: amountInNaira, reference });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          amount: amountInNaira,
          reference,
          status: 'success'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('=== paystack-verify: Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
