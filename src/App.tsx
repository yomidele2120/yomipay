import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Fund from "./pages/Fund";
import Withdraw from "./pages/Withdraw";
import Transactions from "./pages/Transactions";
import Banks from "./pages/Banks";
import Profile from "./pages/Profile";
import Services from "./pages/Services";
import BuyAirtime from "./pages/BuyAirtime";
import BuyData from "./pages/BuyData";
import BuyElectricity from "./pages/BuyElectricity";
import BuyCable from "./pages/BuyCable";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/fund" element={<Fund />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/banks" element={<Banks />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/services" element={<Services />} />
            <Route path="/buy-airtime" element={<BuyAirtime />} />
            <Route path="/buy-data" element={<BuyData />} />
            <Route path="/buy-electricity" element={<BuyElectricity />} />
            <Route path="/buy-cable" element={<BuyCable />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
