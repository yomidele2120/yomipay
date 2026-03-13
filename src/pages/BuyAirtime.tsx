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
import { ArrowLeft, Phone, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { NETWORK_PROVIDERS } from "@/lib/cheapdata-constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const BuyAirtime = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [providerId, setProviderId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <FullPageLoader />;

  const numAmount = parseFloat(amount) || 0;
  const isValid = providerId !== null && phoneNumber.length >= 10 && numAmount >= 50;

  const handlePurchase = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cheapdata-airtime", {
        body: { provider_id: providerId, phone_number: phoneNumber, amount: numAmount },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Purchase failed");

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Airtime Sent! 🎉", description: `₦${numAmount} airtime delivered to ${phoneNumber}` });
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
          <h2 className="text-xl font-bold text-foreground mb-2">Airtime Sent!</h2>
          <p className="text-muted-foreground text-sm mb-6">₦{numAmount} airtime has been sent to {phoneNumber}</p>
          <div className="space-y-3">
            <Button variant="gradient" className="w-full" onClick={() => { setSuccess(false); setAmount(""); setPhoneNumber(""); }}>
              Buy More Airtime
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Go Home
            </Button>
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
            <h1 className="text-lg font-bold text-foreground font-display">Buy Airtime</h1>
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
                onClick={() => setProviderId(provider.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  providerId === provider.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/30"
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
            <Input
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
              placeholder="08012345678"
              className="pl-10 input-yomi"
              maxLength={11}
            />
          </div>
        </section>

        {/* Amount */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₦</span>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9]/g, "")); setSelectedQuick(null); }}
              placeholder="0"
              className="h-14 text-2xl font-bold pl-10 input-yomi"
            />
          </div>
          {amount && numAmount < 50 && <p className="text-sm text-destructive mt-2">Minimum ₦50</p>}
        </section>

        {/* Quick Amounts */}
        <section>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => { setAmount(value.toString()); setSelectedQuick(value); }}
                className={cn(
                  "py-3 rounded-xl border font-semibold text-sm transition-all",
                  selectedQuick === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"
                )}
              >
                {formatCurrency(value)}
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <Button onClick={handlePurchase} disabled={!isValid || loading} variant="gradient" size="lg" className="w-full">
          {loading ? <LoadingSpinner size="sm" /> : <>Buy Airtime {isValid && `• ${formatCurrency(numAmount)}`}</>}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default BuyAirtime;
