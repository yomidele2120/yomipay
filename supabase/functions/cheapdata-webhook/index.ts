import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json();
    console.log('[cheapdata-webhook] Received:', JSON.stringify(body));

    const { event, transaction_id, reference, status } = body;

    if (!event || !reference) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid webhook payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Map CheapDataHub events to our status
    let newStatus: string;
    switch (event) {
      case 'successful':
        newStatus = 'success';
        break;
      case 'failed':
      case 'refunded':
        newStatus = 'failed';
        break;
      case 'processing':
      case 'initiated':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'pending';
    }

    // Find existing transaction
    const { data: existingTx } = await serviceClient
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (!existingTx) {
      console.log(`[cheapdata-webhook] No transaction found for reference: ${reference}`);
      return new Response(JSON.stringify({ success: true, message: 'No matching transaction' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If failed/refunded, refund wallet
    if ((event === 'failed' || event === 'refunded') && existingTx.status !== 'failed') {
      await serviceClient.rpc('refund_wallet_balance', {
        p_user_id: existingTx.user_id,
        p_amount: existingTx.amount,
        p_reference: reference,
      });
      console.log(`[cheapdata-webhook] Refunded ${existingTx.amount} for reference: ${reference}`);
    } else {
      // Update transaction status
      await serviceClient
        .from('transactions')
        .update({
          status: newStatus,
          metadata: { ...((existingTx.metadata as Record<string, unknown>) || {}), webhook_event: event, webhook_transaction_id: transaction_id },
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference);
    }

    console.log(`[cheapdata-webhook] Updated transaction ${reference} to status: ${newStatus}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[cheapdata-webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
