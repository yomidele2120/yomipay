import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || Deno.env.get('LIVE_SECRET_KEY');

    if (!paystackSecretKey) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reference } = body;
    if (!reference) {
      return new Response(JSON.stringify({ success: false, error: 'Reference is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${paystackSecretKey}` },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return new Response(JSON.stringify({ success: false, error: paystackData.message || 'Failed to verify' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (paystackData.data.status !== 'success') {
      return new Response(JSON.stringify({ success: false, error: 'Transaction not successful', status: paystackData.data.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets').select('*').eq('user_id', userId).single();

    if (walletError || !wallet) throw new Error('Wallet not found');

    // Idempotency check
    const { data: existingTx } = await supabase
      .from('transactions').select('id').eq('reference', reference).single();

    if (existingTx) {
      return new Response(JSON.stringify({ success: true, message: 'Already processed', data: { amount: paystackData.data.amount / 100 } }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountInNaira = paystackData.data.amount / 100;

    const { error: txError } = await supabase.from('transactions').insert({
      user_id: userId, wallet_id: wallet.id, type: 'credit', amount: amountInNaira,
      reference, status: 'success', source: 'paystack', description: 'Wallet funding via Paystack',
      metadata: { paystack_data: paystackData.data },
    });

    if (txError) throw new Error('Failed to record transaction');

    const { error: updateError } = await supabase
      .from('wallets').update({ balance: (wallet.balance || 0) + amountInNaira }).eq('id', wallet.id);

    if (updateError) throw new Error('Failed to update wallet balance');

    return new Response(JSON.stringify({ success: true, data: { amount: amountInNaira, reference, status: 'success' } }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('paystack-verify error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
