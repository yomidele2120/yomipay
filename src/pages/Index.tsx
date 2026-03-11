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
import { ArrowRight, TrendingUp, RefreshCw, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { wallet, walletLoading, transactions, verifyPayment, refetchWallet } = useWallet();

  useEffect(() => {
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");
    const ref = reference || trxref;
    if (ref && user) {
      verifyPayment.mutate(ref);
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <FullPageLoader />;

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
              <span className="text-primary font-bold text-lg font-display">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Welcome back</p>
              <h1 className="text-base font-bold text-foreground font-display">
                {user.user_metadata?.full_name || "User"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchWallet()}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", walletLoading && "animate-spin")} />
            </button>
            <button className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <WalletCard balance={wallet?.balance || 0} currency={wallet?.currency || "NGN"} />
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        <section>
          <QuickActions />
        </section>

        {/* Transactions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Transactions</h2>
            {transactions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")} className="text-primary text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>

          {walletLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-18 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map((tx, index) => (
                <div key={tx.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <TransactionItem
                    type={tx.type} amount={tx.amount} status={tx.status}
                    description={tx.description} createdAt={tx.created_at}
                    reference={tx.reference} source={tx.source}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1 text-sm">No transactions yet</p>
              <p className="text-xs text-muted-foreground mb-4">Fund your wallet to get started</p>
              <Button variant="gradient" size="sm" onClick={() => navigate("/fund")}>
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
