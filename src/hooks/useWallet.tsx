import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: "credit" | "debit";
  amount: number;
  reference: string;
  status: "pending" | "success" | "failed" | "reversed";
  source: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface BankAccount {
  id: string;
  user_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  recipient_code: string | null;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch wallet
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async (): Promise<Wallet | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!user?.id,
  });

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery({
    queryKey: ["bankAccounts", user?.id],
    queryFn: async (): Promise<BankAccount[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as BankAccount[];
    },
    enabled: !!user?.id,
  });

  // Initialize Paystack payment
  const initializePayment = useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: { amount },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
      });
    },
  });

  // Verify payment
  const verifyPayment = useMutation({
    mutationFn: async (reference: string) => {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Payment Successful! 🎉",
        description: "Your wallet has been funded.",
      });
    },
  });

  // Withdraw funds
  const withdrawFunds = useMutation({
    mutationFn: async ({ amount, bankAccountId }: { amount: number; bankAccountId: string }) => {
      const { data, error } = await supabase.functions.invoke("paystack-withdraw", {
        body: { amount, bankAccountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Withdrawal Initiated! 💸",
        description: "Your withdrawal is being processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Withdrawal Error",
        description: error.message || "Failed to process withdrawal",
      });
    },
  });

  // Add bank account
  const addBankAccount = useMutation({
    mutationFn: async ({ bankCode, accountNumber }: { bankCode: string; accountNumber: string }) => {
      const { data, error } = await supabase.functions.invoke("paystack-resolve-account", {
        body: { bankCode, accountNumber },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast({
        title: "Bank Account Added! ✅",
        description: "Your bank account has been verified and saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: error.message || "Failed to verify bank account",
      });
    },
  });

  // Delete bank account
  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast({
        title: "Bank Account Removed",
        description: "The bank account has been removed.",
      });
    },
  });

  return {
    wallet,
    walletLoading,
    transactions,
    transactionsLoading,
    bankAccounts,
    bankAccountsLoading,
    initializePayment,
    verifyPayment,
    withdrawFunds,
    addBankAccount,
    deleteBankAccount,
  };
};
