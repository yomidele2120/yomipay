import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  console.log('=== paystack-resolve-account: Request received ===');
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

    // Support both camelCase and snake_case
    const accountNumber = body.accountNumber || body.account_number;
    const bankCode = body.bankCode || body.bank_code;
    const bankName = body.bankName || body.bank_name;

    if (!accountNumber || !bankCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account number and bank code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolving account:', { accountNumber, bankCode });

    // Call Paystack resolve API
    const paystackResponse = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();
    console.log('Paystack resolve response:', paystackData);

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ success: false, error: paystackData.message || 'Could not resolve account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if bank account already exists
    const { data: existingAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_number', accountNumber)
      .eq('bank_code', bankCode)
      .single();

    if (existingAccount) {
      return new Response(
        JSON.stringify({ success: false, error: 'This bank account is already added' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save bank account
    const { data: newAccount, error: insertError } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: user.id,
        bank_code: bankCode,
        bank_name: bankName || 'Unknown Bank',
        account_number: accountNumber,
        account_name: paystackData.data.account_name,
        is_default: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving bank account:', insertError);
      throw new Error('Failed to save bank account');
    }

    console.log('Bank account saved:', newAccount.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: newAccount.id,
          account_name: paystackData.data.account_name,
          account_number: paystackData.data.account_number,
          bank_name: bankName || 'Unknown Bank',
          bank_code: bankCode,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('=== paystack-resolve-account: Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
