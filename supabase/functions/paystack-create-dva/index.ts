import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  console.log('=== paystack-create-dva: Request received ===');
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User profile not found');
    }

    // Check if user already has a virtual account
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet error:', walletError);
      throw new Error('Wallet not found');
    }

    // Check if virtual account already exists in wallet
    if (wallet.virtual_account_number) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Virtual account already exists',
          data: {
            account_number: wallet.virtual_account_number,
            bank_name: wallet.virtual_bank_name,
            account_name: wallet.virtual_account_name,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, create or get customer on Paystack
    console.log('Creating/fetching Paystack customer...');
    
    let customerCode;

    // Try to fetch existing customer
    const fetchCustomerResponse = await fetch(
      `https://api.paystack.co/customer/${encodeURIComponent(user.email || '')}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const fetchCustomerData = await fetchCustomerResponse.json();
    console.log('Fetch customer response:', fetchCustomerData);

    if (fetchCustomerData.status && fetchCustomerData.data) {
      customerCode = fetchCustomerData.data.customer_code;
      console.log('Existing customer found:', customerCode);
    } else {
      // Create new customer
      const createCustomerResponse = await fetch('https://api.paystack.co/customer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          first_name: profile.full_name?.split(' ')[0] || '',
          last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
          phone: profile.phone || '',
        }),
      });

      const createCustomerData = await createCustomerResponse.json();
      console.log('Create customer response:', createCustomerData);

      if (!createCustomerData.status) {
        throw new Error(createCustomerData.message || 'Failed to create customer');
      }

      customerCode = createCustomerData.data.customer_code;
      console.log('New customer created:', customerCode);
    }

    // Create Dedicated Virtual Account
    console.log('Creating dedicated virtual account...');
    
    const dvaResponse = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: 'wema-bank', // or 'titan-paystack' for Titan
      }),
    });

    const dvaData = await dvaResponse.json();
    console.log('DVA response:', dvaData);

    if (!dvaData.status) {
      // Check if DVA already exists
      if (dvaData.message?.includes('already has a dedicated')) {
        // Fetch existing DVA
        const listDvaResponse = await fetch(
          `https://api.paystack.co/dedicated_account?customer=${customerCode}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${paystackSecretKey}`,
            },
          }
        );

        const listDvaData = await listDvaResponse.json();
        console.log('List DVA response:', listDvaData);

        if (listDvaData.status && listDvaData.data && listDvaData.data.length > 0) {
          const existingDva = listDvaData.data[0];
          
          // Update wallet with existing virtual account
          const { error: updateError } = await supabase
            .from('wallets')
            .update({
              virtual_account_number: existingDva.account_number,
              virtual_bank_name: existingDva.bank?.name || 'Wema Bank',
              virtual_account_name: existingDva.account_name,
            })
            .eq('id', wallet.id);

          if (updateError) {
            console.error('Error updating wallet with existing DVA:', updateError);
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                account_number: existingDva.account_number,
                bank_name: existingDva.bank?.name || 'Wema Bank',
                account_name: existingDva.account_name,
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      throw new Error(dvaData.message || 'Failed to create dedicated virtual account');
    }

    const dedicatedAccount = dvaData.data;

    // Update wallet with virtual account details
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        virtual_account_number: dedicatedAccount.account_number,
        virtual_bank_name: dedicatedAccount.bank?.name || 'Wema Bank',
        virtual_account_name: dedicatedAccount.account_name,
      })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
    }

    console.log('DVA created successfully:', dedicatedAccount.account_number);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          account_number: dedicatedAccount.account_number,
          bank_name: dedicatedAccount.bank?.name || 'Wema Bank',
          account_name: dedicatedAccount.account_name,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('=== paystack-create-dva: Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
