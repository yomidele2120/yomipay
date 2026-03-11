import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure environment variables are loaded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  console.error("Environment variables not loaded. VITE_SUPABASE_URL is missing.");
}

const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
} catch (error) {
  console.error("App initialization failed:", error);
  root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
    <div style="text-align:center;">
      <h1>YOMI PAY</h1>
      <p>Loading error. Please refresh the page.</p>
    </div>
  </div>`;
}
