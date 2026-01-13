import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, ArrowUpRight, Building2, AlertCircle, Plus } from "lucide-react";
import { formatCurrency, MIN_WITHDRAWAL, WITHDRAWAL_FEE_PERCENT, WITHDRAWAL_FEE_CAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

const Withdraw = () => {
  const navigate = useNavigate();
  const { wallet, bankAccounts, withdrawFunds } = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setAmount(value);
  };

  const numAmount = parseFloat(amount) || 0;
  const fee = Math.min(numAmount * (WITHDRAWAL_FEE_PERCENT / 100), WITHDRAWAL_FEE_CAP);
  const totalDebit = numAmount + fee;
  const balance = wallet?.balance || 0;

  const isValid =
    numAmount >= MIN_WITHDRAWAL &&
    totalDebit <= balance &&
    selectedBank !== null;

  const handleSubmit = () => {
    if (isValid && selectedBank) {
      withdrawFunds.mutate({ amount: numAmount, bankAccountId: selectedBank });
    }
  };

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
            <h1 className="text-xl font-bold text-foreground">Withdraw</h1>
            <p className="text-sm text-muted-foreground">Send to bank account</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl p-4 text-white">
          <p className="text-white/70 text-sm">Available to Withdraw</p>
          <p className="text-2xl font-bold font-number">{formatCurrency(balance)}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        {/* Amount Input */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <Label className="text-base font-semibold mb-4 block">Withdrawal Amount</Label>
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
          {amount && numAmount < MIN_WITHDRAWAL && (
            <p className="text-sm text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Minimum withdrawal is {formatCurrency(MIN_WITHDRAWAL)}
            </p>
          )}
          {numAmount > 0 && totalDebit > balance && (
            <p className="text-sm text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Insufficient balance
            </p>
          )}
        </section>

        {/* Bank Accounts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Select Bank Account</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/banks")}
              className="text-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {bankAccounts.length > 0 ? (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setSelectedBank(account.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4",
                    selectedBank === account.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {account.account_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {account.bank_name} • ****{account.account_number.slice(-4)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      selectedBank === account.id
                        ? "border-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {selectedBank === account.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card rounded-2xl border border-border">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">No bank accounts</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add a bank account to withdraw
              </p>
              <Button variant="outline" onClick={() => navigate("/banks")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
          )}
        </section>

        {/* Summary */}
        {numAmount >= MIN_WITHDRAWAL && (
          <section className="bg-muted/50 rounded-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatCurrency(numAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Fee ({WITHDRAWAL_FEE_PERCENT}%, max {formatCurrency(WITHDRAWAL_FEE_CAP)})
              </span>
              <span className="font-semibold text-warning">{formatCurrency(fee)}</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-semibold">Total Debit</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(totalDebit)}
              </span>
            </div>
          </section>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || withdrawFunds.isPending}
          variant="gradient"
          size="lg"
          className="w-full"
        >
          {withdrawFunds.isPending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <ArrowUpRight className="w-5 h-5" />
              Withdraw {isValid && `• ${formatCurrency(numAmount)}`}
            </>
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Withdraw;
