import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const projectId = env.VITE_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || "zjaiylujdtnrfthlqbvb";
  const supabaseUrl = env.VITE_SUPABASE_URL || (projectId ? `https://${projectId}.supabase.co` : "");
  const publishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYWl5bHVqZHRucmZ0aGxxYnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkwNzcsImV4cCI6MjA4Mzg4NTA3N30.H3raNxAJVOTr3tSOUz_LYk3Y9SQo1HvrrqXKY9MlJeg";
  const paystackPublicKey =
    env.VITE_PAYSTACK_PUBLIC_KEY || env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || "";

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
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
      "import.meta.env.VITE_PAYSTACK_PUBLIC_KEY": JSON.stringify(paystackPublicKey),
    },
  };
});
