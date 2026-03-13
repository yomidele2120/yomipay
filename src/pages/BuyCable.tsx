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
import { ArrowLeft, Tv, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { CABLE_PROVIDERS, CABLE_PLANS } from "@/lib/cheapdata-constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const BuyCable = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cableProvider, setCableProvider] = useState("");
  const [smartcardNo, setSmartcardNo] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ plan_id: string; name: string; amount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <FullPageLoader />;

  const plans = cableProvider ? CABLE_PLANS[cableProvider] || [] : [];
  const isValid = cableProvider && smartcardNo.length >= 8 && selectedPlan !== null;

  const handlePurchase = async () => {
    if (!isValid || !selectedPlan) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cheapdata-cable", {
        body: { smartcard_no: smartcardNo, plan_id: selectedPlan.plan_id, amount: selectedPlan.amount, plan_name: selectedPlan.name },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Subscription failed");

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Subscription Successful! 📺", description: `${selectedPlan.name} activated` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Subscription failed";
      toast({ variant: "destructive", title: "Subscription Failed", description: message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Subscription Active!</h2>
          <p className="text-muted-foreground text-sm mb-6">{selectedPlan?.name} activated for smartcard {smartcardNo}</p>
          <div className="space-y-3">
            <Button variant="gradient" className="w-full" onClick={() => { setSuccess(false); setSelectedPlan(null); setSmartcardNo(""); }}>
              Subscribe Again
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
            <h1 className="text-lg font-bold text-foreground font-display">Cable TV</h1>
            <p className="text-xs text-muted-foreground">Balance: {formatCurrency(wallet?.balance || 0)}</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6 pb-40">
        {/* Provider Selection */}
        <section>
          <Label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wider">Cable Provider</Label>
          <div className="grid grid-cols-3 gap-2">
            {CABLE_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => { setCableProvider(provider.id); setSelectedPlan(null); }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                  cableProvider === provider.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                )}
              >
                <Tv className={cn("w-6 h-6", cableProvider === provider.id ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-medium text-foreground">{provider.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Smartcard Number */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Smartcard / IUC Number</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={smartcardNo}
            onChange={(e) => setSmartcardNo(e.target.value.replace(/[^0-9]/g, "").slice(0, 15))}
            placeholder="Enter smartcard number"
            className="input-yomi"
          />
        </section>

        {/* Plans */}
        {cableProvider && (
          <section className="animate-fade-in">
            <Label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wider">Select Plan</Label>
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.plan_id}
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                    selectedPlan?.plan_id === plan.plan_id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="font-medium text-sm text-foreground">{plan.name}</span>
                  <span className="font-bold text-sm text-primary">{formatCurrency(plan.amount)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <Button onClick={handlePurchase} disabled={!isValid || loading} variant="gradient" size="lg" className="w-full">
          {loading ? <LoadingSpinner size="sm" /> : <>Subscribe {selectedPlan && `• ${formatCurrency(selectedPlan.amount)}`}</>}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default BuyCable;
