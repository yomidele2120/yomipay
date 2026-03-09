import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Copy, Check, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TransactionReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    type: "credit" | "debit";
    amount: number;
    status: "pending" | "success" | "failed" | "reversed";
    description: string | null;
    reference: string;
    createdAt: string;
    source?: string;
  } | null;
}

export const TransactionReceipt = ({ open, onOpenChange, transaction }: TransactionReceiptProps) => {
  const [copiedRef, setCopiedRef] = useState(false);

  if (!transaction) return null;

  const isCredit = transaction.type === "credit";
  const statusConfig = {
    pending: { icon: Clock, label: "Pending", color: "text-warning", bg: "bg-warning/10" },
    success: { icon: CheckCircle2, label: "Successful", color: "text-success", bg: "bg-success/10" },
    failed: { icon: XCircle, label: "Failed", color: "text-destructive", bg: "bg-destructive/10" },
    reversed: { icon: Clock, label: "Reversed", color: "text-warning", bg: "bg-warning/10" },
  };

  const config = statusConfig[transaction.status];
  const StatusIcon = config.icon;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(transaction.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Transaction Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Icon */}
          <div className="text-center">
            <div className={cn("w-20 h-20 rounded-full mx-auto flex items-center justify-center", config.bg)}>
              <StatusIcon className={cn("w-10 h-10", config.color)} />
            </div>
            <p className={cn("mt-3 font-semibold text-lg", config.color)}>{config.label}</p>
          </div>

          {/* Amount */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{isCredit ? "Amount Received" : "Amount Sent"}</p>
            <p className={cn("text-3xl font-bold font-number", isCredit ? "text-success" : "text-destructive")}>
              {isCredit ? "+" : "-"}{formatCurrency(transaction.amount)}
            </p>
          </div>

          {/* Details */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">{isCredit ? "Credit" : "Debit"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Description</span>
              <span className="text-sm font-medium text-right max-w-[60%] truncate">
                {transaction.description || (isCredit ? "Wallet Funding" : "Withdrawal")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">{formatDate(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Reference</span>
              <button
                onClick={handleCopyRef}
                className="flex items-center gap-1 text-sm font-mono text-primary hover:underline"
              >
                {transaction.reference.slice(0, 16)}...
                {copiedRef ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            {transaction.source && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Source</span>
                <span className="text-sm font-medium capitalize">{transaction.source}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
