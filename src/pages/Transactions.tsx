import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { TransactionItem } from "@/components/TransactionItem";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "credit" | "debit";

const Transactions = () => {
  const navigate = useNavigate();
  const { transactions, transactionsLoading } = useWallet();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTransactions = transactions.filter((tx) => filter === "all" || tx.type === filter);

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "credit", label: "Credits" },
    { value: "debit", label: "Debits" },
  ];

  return (
    <div className="page-container">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground font-display">Transactions</h1>
            <p className="text-xs text-muted-foreground">{transactions.length} transactions</p>
          </div>
        </div>

        <div className="flex gap-1 bg-card border border-border p-1 rounded-xl">
          {filters.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn("flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all duration-200",
                filter === f.value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4">
        {transactionsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-18 rounded-2xl bg-card border border-border animate-pulse" />)}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-2">
            {filteredTransactions.map((tx, index) => (
              <div key={tx.id} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                <TransactionItem type={tx.type} amount={tx.amount} status={tx.status}
                  description={tx.description} createdAt={tx.created_at} reference={tx.reference} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1 text-sm">
              {filter === "all" ? "No transactions yet" : `No ${filter}s found`}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {filter === "all" ? "Your transactions will appear here" : "Try selecting a different filter"}
            </p>
            {filter === "all" && <Button variant="gradient" size="sm" onClick={() => navigate("/fund")}>Fund Wallet</Button>}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Transactions;
