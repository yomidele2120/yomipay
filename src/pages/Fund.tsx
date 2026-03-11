import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Plus, CreditCard, Wallet, Building2, Copy, Check, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const Fund = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { wallet, walletLoading, refetchWallet, initializePayment, verifyPayment, createVirtualAccount } = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [fundingMethod, setFundingMethod] = useState<"card" | "transfer">("card");

  useEffect(() => {
    const shouldVerify = searchParams.get("verify");
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (shouldVerify && reference) {
      verifyPayment.mutate(reference, {
        onSuccess: () => navigate("/fund", { replace: true }),
        onError: () => navigate("/fund", { replace: true }),
      });
    }
  }, [searchParams]);

  const handleQuickAmount = (value: number) => { setAmount(value.toString()); setSelectedQuick(value); };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => { const v = e.target.value.replace(/[^0-9]/g, ""); setAmount(v); setSelectedQuick(null); };
  const handleSubmit = () => { const n = parseFloat(amount); if (n >= 100) initializePayment.mutate(n); };
  const handleCopyAccount = () => {
    if (wallet?.virtual_account_number) {
      navigator.clipboard.writeText(wallet.virtual_account_number);
      setCopied(true);
      toast({ title: "Copied!", description: "Account number copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount >= 100;

  return (
    <div className="page-container">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground font-display">Fund Wallet</h1>
            <p className="text-xs text-muted-foreground">Add money to your wallet</p>
          </div>
          <button onClick={() => refetchWallet()} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", walletLoading && "animate-spin")} />
          </button>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-lg font-bold text-foreground font-number">{formatCurrency(wallet?.balance || 0)}</p>
          </div>
        </div>
      </header>

      {verifyPayment.isPending && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 text-center border border-border max-w-sm mx-4">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Verifying Payment</h3>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      )}

      <main className="px-4 space-y-6 pb-40">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
          <button onClick={() => setFundingMethod("card")}
            className={cn("flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              fundingMethod === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <CreditCard className="w-4 h-4 inline mr-2" />Card/USSD
          </button>
          <button onClick={() => setFundingMethod("transfer")}
            className={cn("flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              fundingMethod === "transfer" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Building2 className="w-4 h-4 inline mr-2" />Transfer
          </button>
        </div>

        {fundingMethod === "transfer" ? (
          <section className="animate-fade-in">
            {wallet?.virtual_account_number ? (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Virtual Account</p>
                    <p className="font-semibold text-primary text-sm">{wallet.virtual_bank_name}</p>
                  </div>
                </div>
                <div className="bg-muted rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                      <p className="text-xl font-bold font-mono tracking-wider">{wallet.virtual_account_number}</p>
                    </div>
                    <button onClick={handleCopyAccount}
                      className={cn("p-3 rounded-xl transition-all", copied ? "bg-success/20 text-success" : "bg-card hover:bg-accent")}>
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Name</span><span className="font-medium">{wallet.virtual_account_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{wallet.virtual_bank_name}</span></div>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-xl">
                  <p className="text-xs text-muted-foreground">💡 Transfer any amount to this account and your wallet will be credited automatically.</p>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-6 border border-border text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-base mb-2">Get Your Virtual Account</h3>
                <p className="text-sm text-muted-foreground mb-6">Create a dedicated bank account number for instant funding.</p>
                <Button onClick={() => createVirtualAccount.mutate()} disabled={createVirtualAccount.isPending} variant="gradient" className="w-full">
                  {createVirtualAccount.isPending ? <LoadingSpinner size="sm" /> : <><Plus className="w-4 h-4" />Create Virtual Account</>}
                </Button>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="bg-card rounded-2xl p-6 border border-border animate-fade-in">
              <Label className="text-sm font-semibold mb-4 block text-muted-foreground">Enter Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                <Input type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} placeholder="0.00"
                  className="h-16 text-3xl font-bold pl-12 pr-4 text-center input-yomi" />
              </div>
              {amount && numAmount < 100 && <p className="text-sm text-destructive mt-2">Minimum amount is ₦100</p>}
            </section>

            <section>
              <Label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wider">Quick Select</Label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button key={value} onClick={() => handleQuickAmount(value)}
                    className={cn("py-3 px-4 rounded-xl border font-semibold text-sm transition-all duration-200",
                      selectedQuick === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/50")}>
                    {formatCurrency(value)}
                  </button>
                ))}
              </div>
            </section>

            {isValid && (
              <section className="bg-card rounded-2xl p-4 border border-border space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatCurrency(numAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-semibold text-success">Free</span>
                </div>
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(numAmount)}</span>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {fundingMethod === "card" && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button onClick={handleSubmit} disabled={!isValid || initializePayment.isPending} variant="gradient" size="lg" className="w-full">
            {initializePayment.isPending ? <LoadingSpinner size="sm" /> : <>Fund Wallet {isValid && `• ${formatCurrency(numAmount)}`}</>}
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Fund;
