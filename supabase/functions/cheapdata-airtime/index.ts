import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CHEAPDATA_BASE = 'https://www.cheapdatahub.ng/api/v1/resellers';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cheapdataKey = Deno.env.get('CHEAPDATAHUB_API_KEY');

    if (!cheapdataKey) throw new Error('CHEAPDATAHUB_API_KEY is not configured');

    // Auth
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

    const body = await req.json();
    const { provider_id, phone_number, amount } = body;

    if (!provider_id || !phone_number || !amount) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: provider_id, phone_number, amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (amount < 50) {
      return new Response(JSON.stringify({ success: false, error: 'Minimum airtime amount is ₦50' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reference = `YOMI_AIR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Atomic wallet deduction
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: deductResult, error: deductError } = await serviceClient.rpc('deduct_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: `Airtime ₦${amount} to ${phone_number}`,
      p_source: 'cheapdatahub_airtime',
    });

    if (deductError) throw deductError;
    const deduction = typeof deductResult === 'string' ? JSON.parse(deductResult) : deductResult;

    if (!deduction.success) {
      return new Response(JSON.stringify({ success: false, error: deduction.error, balance: deduction.balance }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call CheapDataHub
    console.log(`[cheapdata-airtime] Calling API for ${phone_number}, amount: ${amount}, provider: ${provider_id}`);
    const cdhResponse = await fetch(`${CHEAPDATA_BASE}/airtime/purchase/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cheapdataKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider_id, phone_number, amount }),
    });

    const cdhData = await cdhResponse.json();
    console.log(`[cheapdata-airtime] Response:`, JSON.stringify(cdhData));

    if (!cdhResponse.ok || cdhData.status === 'false' || cdhData.status === false) {
      // Refund on failure
      await serviceClient.rpc('refund_wallet_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_reference: reference,
      });

      const errorMsg = cdhData.message || cdhData.error || 'Airtime purchase failed';
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: cdhResponse.status === 409 ? 409 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark successful
    await serviceClient.rpc('complete_transaction', {
      p_reference: reference,
      p_metadata: { cheapdatahub_response: cdhData, provider_id, phone_number },
    });

    return new Response(JSON.stringify({
      success: true,
      message: cdhData.message || 'Airtime purchased successfully',
      reference,
      transaction_id: cdhData.transaction_id,
      new_balance: deduction.new_balance,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[cheapdata-airtime] Error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
