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
    const userEmail = claimsData.claims.email;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) throw new Error('Profile not found');

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (!wallet) throw new Error('Wallet not found');

    if (wallet.virtual_account_number) {
      return new Response(JSON.stringify({
        success: true, message: 'Virtual account already exists',
        data: { account_number: wallet.virtual_account_number, bank_name: wallet.virtual_bank_name, account_name: wallet.virtual_account_name },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get or create Paystack customer
    let customerCode;
    const fetchRes = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(userEmail || '')}`, {
      headers: { 'Authorization': `Bearer ${paystackSecretKey}` },
    });
    const fetchData = await fetchRes.json();

    if (fetchData.status && fetchData.data) {
      customerCode = fetchData.data.customer_code;
    } else {
      const createRes = await fetch('https://api.paystack.co/customer', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail, first_name: profile.full_name?.split(' ')[0] || '',
          last_name: profile.full_name?.split(' ').slice(1).join(' ') || '', phone: profile.phone || '',
        }),
      });
      const createData = await createRes.json();
      if (!createData.status) throw new Error(createData.message || 'Failed to create customer');
      customerCode = createData.data.customer_code;
    }

    // Create DVA
    const dvaRes = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: customerCode, preferred_bank: 'wema-bank' }),
    });
    const dvaData = await dvaRes.json();

    if (!dvaData.status) {
      throw new Error(dvaData.message || 'Failed to create dedicated virtual account');
    }

    const da = dvaData.data;
    await supabase.from('wallets').update({
      virtual_account_number: da.account_number, virtual_bank_name: da.bank?.name || 'Wema Bank',
      virtual_account_name: da.account_name,
    }).eq('id', wallet.id);

    return new Response(JSON.stringify({
      success: true, data: { account_number: da.account_number, bank_name: da.bank?.name || 'Wema Bank', account_name: da.account_name },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('paystack-create-dva error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
