import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, pin, currentPin } = body;

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "Action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simple hash function for PIN (in production, use bcrypt via a library)
    const hashPin = async (pin: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + user.id); // salt with user id
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    if (action === "setup") {
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return new Response(JSON.stringify({ success: false, error: "PIN must be exactly 4 digits" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if PIN already set
      const { data: profile } = await supabase
        .from("profiles")
        .select("transaction_pin_hash")
        .eq("id", user.id)
        .single();

      if (profile?.transaction_pin_hash) {
        return new Response(JSON.stringify({ success: false, error: "PIN already set. Use change action." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hashedPin = await hashPin(pin);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ transaction_pin_hash: hashedPin, pin_set_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        return new Response(JSON.stringify({ success: false, error: "Failed to set PIN" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "PIN set successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!pin || pin.length !== 4) {
        return new Response(JSON.stringify({ success: false, error: "Invalid PIN" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("transaction_pin_hash")
        .eq("id", user.id)
        .single();

      if (!profile?.transaction_pin_hash) {
        return new Response(JSON.stringify({ success: false, error: "PIN not set" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hashedPin = await hashPin(pin);
      const isValid = hashedPin === profile.transaction_pin_hash;

      return new Response(JSON.stringify({ success: isValid, error: isValid ? null : "Incorrect PIN" }), {
        status: isValid ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change") {
      if (!currentPin || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return new Response(JSON.stringify({ success: false, error: "Current PIN and new 4-digit PIN required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("transaction_pin_hash")
        .eq("id", user.id)
        .single();

      if (!profile?.transaction_pin_hash) {
        return new Response(JSON.stringify({ success: false, error: "PIN not set" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hashedCurrent = await hashPin(currentPin);
      if (hashedCurrent !== profile.transaction_pin_hash) {
        return new Response(JSON.stringify({ success: false, error: "Current PIN is incorrect" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hashedNew = await hashPin(pin);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ transaction_pin_hash: hashedNew, pin_set_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        return new Response(JSON.stringify({ success: false, error: "Failed to update PIN" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "PIN changed successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("transaction_pin_hash, pin_set_at")
        .eq("id", user.id)
        .single();

      return new Response(JSON.stringify({
        success: true,
        hasPin: !!profile?.transaction_pin_hash,
        pinSetAt: profile?.pin_set_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PIN management error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
