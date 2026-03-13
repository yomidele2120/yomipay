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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { ELECTRICITY_DISCOS, METER_TYPES } from "@/lib/cheapdata-constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const BuyElectricity = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [disco, setDisco] = useState("");
  const [meterNo, setMeterNo] = useState("");
  const [meterType, setMeterType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultToken, setResultToken] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <FullPageLoader />;

  const numAmount = parseFloat(amount) || 0;
  const isValid = disco && meterNo.length >= 6 && meterType && phoneNumber.length >= 10 && numAmount >= 500;

  const handlePurchase = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cheapdata-electricity", {
        body: { disco, meter_no: meterNo, amount: numAmount, phone_number: phoneNumber, meter_type: meterType },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Purchase failed");

      setSuccess(true);
      setResultToken(data.token || "");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Electricity Purchased! ⚡", description: `₦${numAmount} electricity token generated` });
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
        <div className="text-center animate-fade-in max-w-sm">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Payment Successful!</h2>
          {resultToken && (
            <div className="bg-card rounded-xl p-4 border border-border mb-4">
              <p className="text-xs text-muted-foreground mb-1">Your Token</p>
              <p className="text-lg font-mono font-bold text-primary tracking-wider">{resultToken}</p>
            </div>
          )}
          <p className="text-muted-foreground text-sm mb-6">₦{numAmount} electricity purchased for meter {meterNo}</p>
          <div className="space-y-3">
            <Button variant="gradient" className="w-full" onClick={() => { setSuccess(false); setAmount(""); setMeterNo(""); }}>
              Buy More Electricity
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
            <h1 className="text-lg font-bold text-foreground font-display">Electricity</h1>
            <p className="text-xs text-muted-foreground">Balance: {formatCurrency(wallet?.balance || 0)}</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-5 pb-40">
        {/* Disco */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Distribution Company</Label>
          <Select value={disco} onValueChange={setDisco}>
            <SelectTrigger className="input-yomi"><SelectValue placeholder="Select disco" /></SelectTrigger>
            <SelectContent>
              {ELECTRICITY_DISCOS.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Meter Type */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Meter Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {METER_TYPES.map((type) => (
              <button key={type.id} onClick={() => setMeterType(type.id)}
                className={cn("py-3 rounded-xl border font-semibold text-sm transition-all",
                  meterType === type.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-foreground")}>
                {type.name}
              </button>
            ))}
          </div>
        </section>

        {/* Meter Number */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Meter Number</Label>
          <div className="relative">
            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input type="text" inputMode="numeric" value={meterNo}
              onChange={(e) => setMeterNo(e.target.value.replace(/[^0-9]/g, "").slice(0, 20))}
              placeholder="Enter meter number" className="pl-10 input-yomi" />
          </div>
        </section>

        {/* Phone */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Phone Number</Label>
          <Input type="tel" inputMode="numeric" value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
            placeholder="08012345678" className="input-yomi" maxLength={11} />
        </section>

        {/* Amount */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <Label className="text-sm font-semibold mb-3 block text-muted-foreground">Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₦</span>
            <Input type="text" inputMode="numeric" value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9]/g, "")); setSelectedQuick(null); }}
              placeholder="0" className="h-14 text-2xl font-bold pl-10 input-yomi" />
          </div>
          {amount && numAmount < 500 && <p className="text-sm text-destructive mt-2">Minimum ₦500</p>}
        </section>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <button key={value} onClick={() => { setAmount(value.toString()); setSelectedQuick(value); }}
              className={cn("py-3 rounded-xl border font-semibold text-sm transition-all",
                selectedQuick === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground")}>
              {formatCurrency(value)}
            </button>
          ))}
        </div>
      </main>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <Button onClick={handlePurchase} disabled={!isValid || loading} variant="gradient" size="lg" className="w-full">
          {loading ? <LoadingSpinner size="sm" /> : <>Pay Electricity {isValid && `• ${formatCurrency(numAmount)}`}</>}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default BuyElectricity;
