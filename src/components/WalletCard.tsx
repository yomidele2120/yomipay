import { Eye, EyeOff, Copy, Check, Building2 } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface WalletCardProps {
  balance: number;
  currency?: string;
  className?: string;
}

export const WalletCard = ({ balance, currency = "NGN", className }: WalletCardProps) => {
  const { user } = useAuth();
  const { wallet, createVirtualAccount } = useWallet();
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.email || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAccount = () => {
    if (wallet?.virtual_account_number) {
      navigator.clipboard.writeText(wallet.virtual_account_number);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Wallet Card */}
      <div className="wallet-card animate-fade-in">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div>
            <p className="text-white/70 text-sm font-medium">Available Balance</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-bold text-white font-number">
                {showBalance ? formatCurrency(balance, currency) : "₦••••••"}
              </h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {showBalance ? (
                  <EyeOff className="w-4 h-4 text-white" />
                ) : (
                  <Eye className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
          
          {/* Logo */}
          <div className="text-right">
            <span className="text-xl font-bold text-white tracking-tight">YOMI</span>
            <span className="text-xl font-light text-white/80 tracking-tight"> PAY</span>
          </div>
        </div>

        {/* Account Info */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/20">
          <div>
            <p className="text-white/60 text-xs mb-1">Account Email</p>
            <p className="text-white text-sm font-medium truncate max-w-[180px]">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Copy className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Virtual Account Section */}
      {wallet?.virtual_account_number ? (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-4 border border-primary/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Receive funds via bank transfer</p>
              <p className="font-bold text-foreground font-mono tracking-wider">
                {wallet.virtual_account_number}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {wallet.virtual_bank_name} • {wallet.virtual_account_name}
              </p>
            </div>
            <button
              onClick={handleCopyAccount}
              className={cn(
                "p-2 rounded-lg transition-all shrink-0",
                copiedAccount ? "bg-success/20 text-success" : "bg-muted hover:bg-muted/80"
              )}
            >
              {copiedAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-4 border border-border animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Get Your Account Number</p>
              <p className="text-xs text-muted-foreground">Receive funds via bank transfer</p>
            </div>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => createVirtualAccount.mutate()}
              disabled={createVirtualAccount.isPending}
            >
              {createVirtualAccount.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};