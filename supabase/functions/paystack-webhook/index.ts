import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
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
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  console.log('=== paystack-webhook: Request received ===');
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

    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    console.log('Webhook signature present:', !!signature);

    // Verify signature
    if (!signature || !(await verifySignature(body, signature, paystackSecretKey))) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch {
      console.error('Failed to parse webhook body');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook event:', event.event, 'Reference:', event.data?.reference);

    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.event) {
      case 'charge.success': {
        const { reference, amount, customer } = event.data;
        console.log('Processing charge.success:', { reference, amount, email: customer?.email });
        
        // Check if transaction already exists (idempotency)
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
            const { error: txError } = await supabase
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

            if (txError) {
              console.error('Error creating transaction:', txError);
            }

            // Update wallet
            const { error: updateError } = await supabase
              .from('wallets')
              .update({ balance: (wallet.balance || 0) + amountInNaira })
              .eq('id', wallet.id);

            if (updateError) {
              console.error('Error updating wallet:', updateError);
            }

            console.log('Webhook processed charge.success:', { reference, amount: amountInNaira });
          }
        } else {
          console.log('User not found for email:', customer?.email);
        }
        break;
      }

      case 'dedicatedaccount.assign.success': {
        const { customer, dedicated_account } = event.data;
        console.log('Processing dedicatedaccount.assign.success:', customer?.email);

        if (customer?.email && dedicated_account) {
          // Find user by email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customer.email)
            .single();

          if (profile) {
            // Update wallet with virtual account details
            const { error } = await supabase
              .from('wallets')
              .update({ 
                virtual_account_number: dedicated_account.account_number,
                virtual_bank_name: dedicated_account.bank?.name,
                virtual_account_name: dedicated_account.account_name,
              })
              .eq('user_id', profile.id);

            if (error) {
              console.error('Error updating virtual account:', error);
            } else {
              console.log('Virtual account assigned:', dedicated_account.account_number);
            }
          }
        }
        break;
      }

      case 'transfer.success': {
        const { reference } = event.data;
        console.log('Processing transfer.success:', reference);
        
        const { error } = await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('reference', reference);

        if (error) {
          console.error('Error updating transaction:', error);
        } else {
          console.log('Transfer successful:', reference);
        }
        break;
      }

      case 'transfer.failed': {
        const { reference, amount } = event.data;
        console.log('Processing transfer.failed:', reference);
        
        // Update transaction status
        const { data: tx, error: txError } = await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('reference', reference)
          .select('user_id, wallet_id')
          .single();

        if (txError) {
          console.error('Error updating transaction:', txError);
        }

        // Refund the amount to wallet
        if (tx) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', tx.wallet_id)
            .single();

          if (wallet) {
            const { error } = await supabase
              .from('wallets')
              .update({ balance: (wallet.balance || 0) + (amount / 100) })
              .eq('id', tx.wallet_id);

            if (error) {
              console.error('Error refunding wallet:', error);
            } else {
              console.log('Transfer failed, amount refunded:', reference);
            }
          }
        }
        break;
      }

      case 'transfer.reversed': {
        const { reference, amount } = event.data;
        console.log('Processing transfer.reversed:', reference);
        
        const { data: tx, error: txError } = await supabase
          .from('transactions')
          .update({ status: 'reversed' })
          .eq('reference', reference)
          .select('user_id, wallet_id')
          .single();

        if (txError) {
          console.error('Error updating transaction:', txError);
        }

        if (tx) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', tx.wallet_id)
            .single();

          if (wallet) {
            const { error } = await supabase
              .from('wallets')
              .update({ balance: (wallet.balance || 0) + (amount / 100) })
              .eq('id', tx.wallet_id);

            if (error) {
              console.error('Error refunding wallet:', error);
            } else {
              console.log('Transfer reversed, amount refunded:', reference);
            }
          }
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('=== paystack-webhook: Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
