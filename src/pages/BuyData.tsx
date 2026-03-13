import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { FullPageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wifi, Phone, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { NETWORK_PROVIDERS, DATA_PLANS } from "@/lib/cheapdata-constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const BuyData = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [providerId, setProviderId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ bundle_id: number; name: string; amount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <FullPageLoader />;

  const plans = providerId ? DATA_PLANS[providerId] || [] : [];
  const isValid = providerId !== null && phoneNumber.length >= 10 && selectedPlan !== null;

  const handlePurchase = async () => {
    if (!isValid || !selectedPlan) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cheapdata-data", {
        body: { bundle_id: selectedPlan.bundle_id, phone_number: phoneNumber, amount: selectedPlan.amount, plan_name: selectedPlan.name },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Purchase failed");

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Data Purchased! 🎉", description: `${selectedPlan.name} delivered to ${phoneNumber}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      toast({ variant: "destructive", title: "Purchase Failed", description: message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Data Purchased!</h2>
          <p className="text-muted-foreground text-sm mb-6">{selectedPlan?.name} has been sent to {phoneNumber}</p>
          <div className="space-y-3">
            <Button variant="gradient" className="w-full" onClick={() => { setSuccess(false); setSelectedPlan(null); setPhoneNumber(""); }}>
              Buy More Data
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground font-display">Buy Data</h1>
            <p className="text-xs text-muted-foreground">Balance: {formatCurrency(wallet?.balance || 0)}</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6 pb-40">
        {/* Network Selection */}
        <section>
          <Label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wider">Select Network</Label>
          <div className="grid grid-cols-4 gap-2">
            {NETWORK_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => { setProviderId(provider.id); setSelectedPlan(null); }}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  providerId === provider.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                )}
              >
                <span className="text-2xl">{provider.icon}</span>
                <span className="text-xs font-medium text-foreground">{provider.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Phone Number */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input type="tel" inputMode="numeric" value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
              placeholder="08012345678" className="pl-10 input-yomi" maxLength={11} />
          </div>
        </section>

        {/* Data Plans */}
        {providerId && (
          <section className="animate-fade-in">
            <Label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wider">Select Plan</Label>
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.bundle_id}
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                    selectedPlan?.bundle_id === plan.bundle_id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-sm text-foreground">{plan.name}</span>
                  </div>
                  <span className="font-bold text-sm text-primary">{formatCurrency(plan.amount)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <Button onClick={handlePurchase} disabled={!isValid || loading} variant="gradient" size="lg" className="w-full">
          {loading ? <LoadingSpinner size="sm" /> : <>Buy Data {selectedPlan && `• ${formatCurrency(selectedPlan.amount)}`}</>}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default BuyData;
