import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const projectId =
    env.VITE_SUPABASE_PROJECT_ID ||
    env.SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID ||
    process.env.SUPABASE_PROJECT_ID ||
    "";
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (projectId ? `https://${projectId}.supabase.co` : "");
  const publishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  const paystackPublicKey =
    env.VITE_PAYSTACK_PUBLIC_KEY ||
    env.PAYSTACK_PUBLIC_KEY ||
    env.LIVE_PUBLIC_KEY ||
    process.env.VITE_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.LIVE_PUBLIC_KEY ||
    "";

  return {
    base: "/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      ...(supabaseUrl ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl) } : {}),
      ...(projectId ? { "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(projectId) } : {}),
      ...(publishableKey ? { "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey) } : {}),
      ...(publishableKey ? { "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(publishableKey) } : {}),
      ...(paystackPublicKey ? { "import.meta.env.VITE_PAYSTACK_PUBLIC_KEY": JSON.stringify(paystackPublicKey) } : {}),
    },
  };
});
