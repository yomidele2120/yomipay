import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Search,
} from "lucide-react";
import { NIGERIAN_BANKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Banks = () => {
  const navigate = useNavigate();
  const { bankAccounts, bankAccountsLoading, addBankAccount, deleteBankAccount } = useWallet();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBankSelect, setShowBankSelect] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState("");

  const filteredBanks = NIGERIAN_BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleAddAccount = () => {
    if (selectedBank && accountNumber.length === 10) {
      addBankAccount.mutate(
        { bankCode: selectedBank.code, bankName: selectedBank.name, accountNumber },
        {
          onSuccess: () => {
            setShowAddDialog(false);
            setSelectedBank(null);
            setAccountNumber("");
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this bank account?")) {
      deleteBankAccount.mutate(id);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Bank Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Manage your withdrawal accounts
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Bank Selection */}
                <div className="space-y-2">
                  <Label>Select Bank</Label>
                  <button
                    onClick={() => setShowBankSelect(!showBankSelect)}
                    className="w-full p-4 rounded-xl border border-border bg-card text-left flex items-center justify-between hover:border-primary/50 transition-colors"
                  >
                    <span className={selectedBank ? "text-foreground" : "text-muted-foreground"}>
                      {selectedBank?.name || "Choose a bank"}
                    </span>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </button>

                  {showBankSelect && (
                    <div className="border border-border rounded-xl bg-card overflow-hidden animate-scale-in">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={bankSearch}
                            onChange={(e) => setBankSearch(e.target.value)}
                            placeholder="Search banks..."
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredBanks.map((bank) => (
                          <button
                            key={bank.code}
                            onClick={() => {
                              setSelectedBank(bank);
                              setShowBankSelect(false);
                              setBankSearch("");
                            }}
                            className={cn(
                              "w-full p-3 text-left flex items-center justify-between hover:bg-muted transition-colors",
                              selectedBank?.code === bank.code && "bg-primary/5"
                            )}
                          >
                            <span>{bank.name}</span>
                            {selectedBank?.code === bank.code && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit account number"
                    className="input-yomi"
                  />
                  {accountNumber && accountNumber.length !== 10 && (
                    <p className="text-sm text-destructive">
                      Account number must be 10 digits
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAddAccount}
                  disabled={
                    !selectedBank ||
                    accountNumber.length !== 10 ||
                    addBankAccount.isPending
                  }
                  variant="gradient"
                  className="w-full"
                >
                  {addBankAccount.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    "Verify & Add Account"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4">
        {bankAccountsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : bankAccounts.length > 0 ? (
          <div className="space-y-3">
            {bankAccounts.map((account, index) => (
              <div
                key={account.id}
                className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {account.account_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {account.bank_name}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {account.account_number}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(account.id)}
                  disabled={deleteBankAccount.isPending}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">No bank accounts</p>
            <p className="text-sm text-muted-foreground mb-6">
              Add a bank account to withdraw funds
            </p>
            <Button variant="gradient" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Banks;
