import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PinSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PinSetupDialog = ({ open, onOpenChange, onSuccess }: PinSetupDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const currentPin = step === "enter" ? pin : confirmPin;
  const setCurrentPin = step === "enter" ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length < 4) {
      setCurrentPin(currentPin + digit);
    }
  };

  const handleDelete = () => {
    setCurrentPin(currentPin.slice(0, -1));
  };

  const handleNext = async () => {
    if (step === "enter" && pin.length === 4) {
      setStep("confirm");
      return;
    }

    if (step === "confirm" && confirmPin.length === 4) {
      if (pin !== confirmPin) {
        toast({ variant: "destructive", title: "PINs don't match", description: "Please try again." });
        setConfirmPin("");
        setStep("enter");
        setPin("");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("manage-pin", {
          body: { action: "setup", pin },
        });
        if (error || !data?.success) {
          throw new Error(data?.error || "Failed to set PIN");
        }
        toast({ title: "PIN Set Successfully! 🔐", description: "Your transaction PIN is now active." });
        onSuccess();
        resetState();
        onOpenChange(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      } finally {
        setLoading(false);
      }
    }
  };

  const resetState = () => {
    setPin("");
    setConfirmPin("");
    setStep("enter");
  };

  // Auto-advance when 4 digits entered
  if (currentPin.length === 4 && !loading) {
    setTimeout(() => handleNext(), 200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {step === "enter" ? "Create Transaction PIN" : "Confirm Your PIN"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "enter"
              ? "Set a 4-digit PIN to secure your withdrawals"
              : "Re-enter your PIN to confirm"}
          </DialogDescription>
        </DialogHeader>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 my-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all",
                i < currentPin.length
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted"
              )}
            >
              {i < currentPin.length && (
                <div className="w-3 h-3 rounded-full bg-primary" />
              )}
            </div>
          ))}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num.toString())}
              disabled={loading}
              className="h-14 rounded-xl bg-card border border-border text-xl font-bold hover:bg-muted transition-colors"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit("0")}
            disabled={loading}
            className="h-14 rounded-xl bg-card border border-border text-xl font-bold hover:bg-muted transition-colors"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-14 rounded-xl bg-muted text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            ⌫
          </button>
        </div>

        {loading && (
          <div className="flex justify-center mt-4">
            <LoadingSpinner size="md" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
