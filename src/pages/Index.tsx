import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { WalletCard } from "@/components/WalletCard";
import { QuickActions } from "@/components/QuickActions";
import { TransactionItem } from "@/components/TransactionItem";
import { BottomNav } from "@/components/BottomNav";
import { FullPageLoader } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { wallet, walletLoading, transactions, verifyPayment, refetchWallet } = useWallet();

  // Handle Paystack callback
  useEffect(() => {
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");
    const ref = reference || trxref;

    if (ref && user) {
      verifyPayment.mutate(ref);
      // Clean up URL
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return <FullPageLoader />;
  }

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground text-sm">Good day! 👋</p>
            <h1 className="text-xl font-bold text-foreground">
              {user.user_metadata?.full_name || "User"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchWallet()}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn("w-5 h-5", walletLoading && "animate-spin")} />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Card with Virtual Account */}
        <WalletCard
          balance={wallet?.balance || 0}
          currency={wallet?.currency || "NGN"}
        />
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        {/* Quick Actions */}
        <section>
          <QuickActions />
        </section>

        {/* KYC Banner */}
        <section className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">Complete KYC Verification</p>
              <p className="text-xs text-muted-foreground">Unlock higher transaction limits</p>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-600">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Transactions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Recent Transactions</h2>
            {transactions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/transactions")}
                className="text-primary"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {walletLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TransactionItem
                    type={tx.type}
                    amount={tx.amount}
                    status={tx.status}
                    description={tx.description}
                    createdAt={tx.created_at}
                    reference={tx.reference}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">No transactions yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Fund your wallet to get started
              </p>
              <Button variant="gradient" onClick={() => navigate("/fund")}>
                Fund Wallet
              </Button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;