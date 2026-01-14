import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === signature;
}

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

    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    // Verify signature
    if (!signature || !(await verifySignature(body, signature, paystackSecretKey))) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    console.log('Webhook event:', event.event, event.data?.reference);

    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.event) {
      case 'charge.success': {
        const { reference, amount, customer } = event.data;
        
        // Check if transaction already exists
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference', reference)
          .single();

        if (existingTx) {
          console.log('Transaction already processed:', reference);
          break;
        }

        // Find user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (profile) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', profile.id)
            .single();

          if (wallet) {
            const amountInNaira = amount / 100;

            // Create transaction
            await supabase
              .from('transactions')
              .insert({
                user_id: profile.id,
                wallet_id: wallet.id,
                type: 'credit',
                amount: amountInNaira,
                reference,
                status: 'success',
                source: 'paystack_webhook',
                description: 'Wallet funding via Paystack',
                metadata: { webhook_data: event.data }
              });

            // Update wallet
            await supabase
              .from('wallets')
              .update({ balance: wallet.balance + amountInNaira })
              .eq('id', wallet.id);

            console.log('Webhook processed charge.success:', { reference, amount: amountInNaira });
          }
        }
        break;
      }

      case 'transfer.success': {
        const { reference } = event.data;
        
        await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('reference', reference);

        console.log('Transfer successful:', reference);
        break;
      }

      case 'transfer.failed': {
        const { reference, amount } = event.data;
        
        // Update transaction status
        const { data: tx } = await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('reference', reference)
          .select('user_id, wallet_id')
          .single();

        // Refund the amount to wallet
        if (tx) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', tx.wallet_id)
            .single();

          if (wallet) {
            await supabase
              .from('wallets')
              .update({ balance: wallet.balance + (amount / 100) })
              .eq('id', tx.wallet_id);
          }
        }

        console.log('Transfer failed, amount refunded:', reference);
        break;
      }

      case 'transfer.reversed': {
        const { reference, amount } = event.data;
        
        const { data: tx } = await supabase
          .from('transactions')
          .update({ status: 'reversed' })
          .eq('reference', reference)
          .select('user_id, wallet_id')
          .single();

        if (tx) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', tx.wallet_id)
            .single();

          if (wallet) {
            await supabase
              .from('wallets')
              .update({ balance: wallet.balance + (amount / 100) })
              .eq('id', tx.wallet_id);
          }
        }

        console.log('Transfer reversed, amount refunded:', reference);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
