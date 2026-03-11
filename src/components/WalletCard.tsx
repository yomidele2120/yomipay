import { Eye, EyeOff, Copy, Check, Building2 } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  balance: number;
  currency?: string;
  className?: string;
}

export const WalletCard = ({ balance, currency = "NGN", className }: WalletCardProps) => {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const [showBalance, setShowBalance] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleCopyAccount = () => {
    if (wallet?.virtual_account_number) {
      navigator.clipboard.writeText(wallet.virtual_account_number);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Balance Card */}
      <div className="wallet-card animate-fade-in">
        <div className="relative z-10">
          {/* Top row */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Portfolio</p>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-primary font-display">YOMI</span>
              <span className="text-xs font-light text-muted-foreground font-display"> PAY</span>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-3xl font-bold text-foreground font-number font-display">
              {showBalance ? formatCurrency(balance, currency) : "₦••••••"}
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-full bg-muted hover:bg-accent transition-colors"
            >
              {showBalance ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Account info */}
          <div className="pt-3 border-t border-border">
            <p className="text-muted-foreground text-xs truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Virtual Account */}
      {wallet?.virtual_account_number && (
        <div className="bg-card rounded-2xl p-4 border border-border animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Receive via bank transfer</p>
              <p className="font-bold text-foreground font-mono tracking-wider text-sm">
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
                copiedAccount ? "bg-success/20 text-success" : "bg-muted hover:bg-accent"
              )}
            >
              {copiedAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
