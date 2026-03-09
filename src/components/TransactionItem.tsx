import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TransactionReceipt } from "@/components/TransactionReceipt";

interface TransactionItemProps {
  type: "credit" | "debit";
  amount: number;
  status: "pending" | "success" | "failed" | "reversed";
  description: string | null;
  createdAt: string;
  reference: string;
  source?: string;
}

export const TransactionItem = ({
  type,
  amount,
  status,
  description,
  createdAt,
  reference,
  source,
}: TransactionItemProps) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const isCredit = type === "credit";

  const statusConfig = {
    pending: { icon: Clock, label: "Pending", className: "badge-pending" },
    success: { icon: CheckCircle2, label: "Success", className: "badge-success" },
    failed: { icon: XCircle, label: "Failed", className: "badge-failed" },
    reversed: { icon: RotateCcw, label: "Reversed", className: "badge-pending" },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <>
      <button
        onClick={() => setShowReceipt(true)}
        className="transaction-item w-full text-left"
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            isCredit ? "bg-success/10" : "bg-destructive/10"
          )}
        >
          {isCredit ? (
            <ArrowDownLeft className="w-5 h-5 text-success" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-destructive" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {description || (isCredit ? "Wallet Funding" : "Withdrawal")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(createdAt)}
          </p>
        </div>

        {/* Amount & Status */}
        <div className="text-right shrink-0">
          <p
            className={cn(
              "font-bold font-number",
              isCredit ? "text-success" : "text-destructive"
            )}
          >
            {isCredit ? "+" : "-"}{formatCurrency(amount)}
          </p>
          <span className={statusConfig[status].className}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig[status].label}
          </span>
        </div>
      </button>

      <TransactionReceipt
        open={showReceipt}
        onOpenChange={setShowReceipt}
        transaction={{
          type,
          amount,
          status,
          description,
          reference,
          createdAt,
          source,
        }}
      />
    </>
  );
};
