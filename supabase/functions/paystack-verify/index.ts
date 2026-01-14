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

    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Reference is required');
    }

    console.log('Verifying Paystack transaction:', reference);

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();
    console.log('Paystack verify response:', data);

    if (!data.status) {
      throw new Error(data.message || 'Failed to verify transaction');
    }

    if (data.data.status !== 'success') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Transaction not successful',
        status: data.data.status,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Check if transaction already exists
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .single();

    if (existingTx) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Transaction already processed',
        data: { amount: data.data.amount / 100 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountInNaira = data.data.amount / 100;

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
        metadata: { paystack_data: data.data }
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
      throw new Error('Failed to record transaction');
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance + amountInNaira })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw new Error('Failed to update wallet balance');
    }

    console.log('Transaction verified and wallet updated:', { amount: amountInNaira, reference });

    return new Response(JSON.stringify({
      success: true,
      data: {
        amount: amountInNaira,
        reference,
        status: 'success'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error verifying transaction:', error);
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
