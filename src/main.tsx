import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import "./index.css";

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

const bootstrap = async () => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      const missing = [];
      if (!url) missing.push("VITE_SUPABASE_URL");
      if (!key) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
      throw new Error(`Missing required configuration: ${missing.join(", ")}`);
    }

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
