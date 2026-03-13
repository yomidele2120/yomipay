import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import "./index.css";

type RuntimeEnv = Record<string, string | boolean | undefined>;

const injectedEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseProjectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element '#root' not found.");
}

const root = createRoot(rootElement);

const renderBootFallback = (message: string) => {
  root.render(
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <h1 className="text-xl font-semibold">Unable to load YOMI PAY</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload app
        </button>
      </section>
    </main>
  );
};

const FALLBACK_PROJECT_ID = "zjaiylujdtnrfthlqbvb";
const FALLBACK_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYWl5bHVqZHRucmZ0aGxxYnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkwNzcsImV4cCI6MjA4Mzg4NTA3N30.H3raNxAJVOTr3tSOUz_LYk3Y9SQo1HvrrqXKY9MlJeg";

const ensureRuntimeEnv = () => {
  const runtimeEnv = import.meta.env as RuntimeEnv;

  // Apply injected values first
  if (!runtimeEnv.VITE_SUPABASE_URL && injectedEnv.supabaseUrl) {
    runtimeEnv.VITE_SUPABASE_URL = String(injectedEnv.supabaseUrl);
  }
  if (!runtimeEnv.VITE_SUPABASE_PROJECT_ID && injectedEnv.supabaseProjectId) {
    runtimeEnv.VITE_SUPABASE_PROJECT_ID = String(injectedEnv.supabaseProjectId);
  }
  if (!runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY && injectedEnv.supabasePublishableKey) {
    runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY = String(injectedEnv.supabasePublishableKey);
  }
  if (!runtimeEnv.VITE_SUPABASE_ANON_KEY && injectedEnv.supabaseAnonKey) {
    runtimeEnv.VITE_SUPABASE_ANON_KEY = String(injectedEnv.supabaseAnonKey);
  }

  // Derive from project ID
  if (!runtimeEnv.VITE_SUPABASE_URL && runtimeEnv.VITE_SUPABASE_PROJECT_ID) {
    runtimeEnv.VITE_SUPABASE_URL = `https://${runtimeEnv.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
  }
  if (!runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY && runtimeEnv.VITE_SUPABASE_ANON_KEY) {
    runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY = String(runtimeEnv.VITE_SUPABASE_ANON_KEY);
  }

  // Hardcoded fallbacks — these are public anon keys, safe to embed
  if (!runtimeEnv.VITE_SUPABASE_URL) {
    runtimeEnv.VITE_SUPABASE_URL = FALLBACK_URL;
  }
  if (!runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY) {
    runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY = FALLBACK_KEY;
  }
  if (!runtimeEnv.VITE_SUPABASE_ANON_KEY) {
    runtimeEnv.VITE_SUPABASE_ANON_KEY = FALLBACK_KEY;
  }
  if (!runtimeEnv.VITE_SUPABASE_PROJECT_ID) {
    runtimeEnv.VITE_SUPABASE_PROJECT_ID = FALLBACK_PROJECT_ID;
  }
};

const bootstrap = async () => {
  try {
    ensureRuntimeEnv();

    const [{ default: App }, { RootErrorBoundary }] = await Promise.all([
      import("./App.tsx"),
      import("./components/RootErrorBoundary"),
    ]);

    root.render(
      <StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error("App bootstrap failed:", error);
    renderBootFallback(error instanceof Error ? error.message : "Unknown startup error");
  }
};

bootstrap();
