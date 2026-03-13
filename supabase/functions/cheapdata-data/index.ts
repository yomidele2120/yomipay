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
    const { bundle_id, phone_number, amount, plan_name } = body;

    if (!bundle_id || !phone_number) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: bundle_id, phone_number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reference = `YOMI_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: deductResult, error: deductError } = await serviceClient.rpc('deduct_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: `Data ${plan_name || bundle_id} to ${phone_number}`,
      p_source: 'cheapdatahub_data',
    });

    if (deductError) throw deductError;
    const deduction = typeof deductResult === 'string' ? JSON.parse(deductResult) : deductResult;

    if (!deduction.success) {
      return new Response(JSON.stringify({ success: false, error: deduction.error, balance: deduction.balance }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[cheapdata-data] Calling API for ${phone_number}, bundle: ${bundle_id}`);
    const cdhResponse = await fetch(`${CHEAPDATA_BASE}/data/purchase/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cheapdataKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bundle_id, phone_number }),
    });

    const cdhData = await cdhResponse.json();
    console.log(`[cheapdata-data] Response:`, JSON.stringify(cdhData));

    if (!cdhResponse.ok || cdhData.status === 'false' || cdhData.status === false) {
      await serviceClient.rpc('refund_wallet_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_reference: reference,
      });

      return new Response(JSON.stringify({ success: false, error: cdhData.message || 'Data purchase failed' }), {
        status: cdhResponse.status === 409 ? 409 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await serviceClient.rpc('complete_transaction', {
      p_reference: reference,
      p_metadata: { cheapdatahub_response: cdhData, bundle_id, phone_number },
    });

    return new Response(JSON.stringify({
      success: true,
      message: cdhData.message || 'Data purchased successfully',
      reference,
      transaction_id: cdhData.transaction_id,
      new_balance: deduction.new_balance,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[cheapdata-data] Error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
