import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  balance: number;
  currency?: string;
  className?: string;
}

export const WalletCard = ({ balance, currency = "NGN", className }: WalletCardProps) => {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.email || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("wallet-card animate-fade-in", className)}>
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
  );
};
