import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Plus, CreditCard, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const Fund = () => {
  const navigate = useNavigate();
  const { wallet, initializePayment } = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setSelectedQuick(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setAmount(value);
    setSelectedQuick(null);
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (numAmount >= 100) {
      initializePayment.mutate(numAmount);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount >= 100;

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Fund Wallet</h1>
            <p className="text-sm text-muted-foreground">Add money to your wallet</p>
          </div>
        </div>

        {/* Current Balance */}
        <div className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold text-foreground font-number">
              {formatCurrency(wallet?.balance || 0)}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        {/* Amount Input */}
        <section className="bg-card rounded-2xl p-6 border border-border animate-fade-in">
          <Label className="text-base font-semibold mb-4 block">Enter Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
              ₦
            </span>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="h-16 text-3xl font-bold pl-12 pr-4 text-center input-yomi"
            />
          </div>
          {amount && numAmount < 100 && (
            <p className="text-sm text-destructive mt-2">Minimum amount is ₦100</p>
          )}
        </section>

        {/* Quick Amounts */}
        <section>
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">
            Quick Select
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => handleQuickAmount(value)}
                className={cn(
                  "py-3 px-4 rounded-xl border-2 font-semibold transition-all duration-200",
                  selectedQuick === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                )}
              >
                {formatCurrency(value)}
              </button>
            ))}
          </div>
        </section>

        {/* Payment Method */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Card / Bank Transfer</p>
              <p className="text-sm text-muted-foreground">Pay with Paystack</p>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        </section>

        {/* Summary */}
        {isValid && (
          <section className="bg-muted/50 rounded-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatCurrency(numAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-semibold text-success">Free</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(numAmount)}</span>
            </div>
          </section>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || initializePayment.isPending}
          variant="gradient"
          size="lg"
          className="w-full"
        >
          {initializePayment.isPending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Fund Wallet {isValid && `• ${formatCurrency(numAmount)}`}
            </>
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Fund;
