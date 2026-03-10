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

    const accountNumber = body.accountNumber || body.account_number;
    const bankCode = body.bankCode || body.bank_code;
    const bankName = body.bankName || body.bank_name;

    if (!accountNumber || !bankCode) {
      return new Response(JSON.stringify({ success: false, error: 'Account number and bank code are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate account number format
    if (!/^\d{10}$/.test(accountNumber)) {
      return new Response(JSON.stringify({ success: false, error: 'Account number must be 10 digits' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve account with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${paystackSecretKey}` } }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return new Response(JSON.stringify({ success: false, error: paystackData.message || 'Could not resolve account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check duplicate
    const { data: existingAccount } = await supabase
      .from('bank_accounts').select('id')
      .eq('user_id', userId).eq('account_number', accountNumber).eq('bank_code', bankCode)
      .single();

    if (existingAccount) {
      return new Response(JSON.stringify({ success: false, error: 'This bank account is already added' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save bank account
    const { data: newAccount, error: insertError } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: userId, bank_code: bankCode, bank_name: bankName || 'Unknown Bank',
        account_number: accountNumber, account_name: paystackData.data.account_name, is_default: false,
      })
      .select().single();

    if (insertError) throw new Error('Failed to save bank account');

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: newAccount.id, account_name: paystackData.data.account_name,
        account_number: paystackData.data.account_number, bank_name: bankName || 'Unknown Bank', bank_code: bankCode,
      },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('paystack-resolve-account error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
