import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PinVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export const PinVerifyDialog = ({
  open,
  onOpenChange,
  onVerified,
  title = "Enter Transaction PIN",
  description = "Enter your 4-digit PIN to authorize this transaction",
}: PinVerifyDialogProps) => {
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const verifyPin = async (pinValue: string) => {
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("manage-pin", {
        body: { action: "verify", pin: pinValue },
      });
      if (fnError || !data?.success) {
        setError(data?.error || "Incorrect PIN");
        setPin("");
        return;
      }
      onVerified();
      setPin("");
      onOpenChange(false);
    } catch (err: any) {
      setError("Verification failed");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setPin("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 my-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all",
                error ? "border-destructive bg-destructive/10" :
                  i < pin.length ? "border-primary bg-primary/10" : "border-border bg-muted"
              )}
            >
              {i < pin.length && (
                <div className={cn("w-3 h-3 rounded-full", error ? "bg-destructive" : "bg-primary")} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive mb-2">{error}</p>
        )}

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
