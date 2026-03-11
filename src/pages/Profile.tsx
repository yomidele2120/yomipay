import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Shield, CreditCard, LogOut, ChevronRight, Bell, HelpCircle, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { wallet, transactions } = useWallet();

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const menuItems = [
    { icon: Shield, label: "KYC Verification", description: "Verify your identity", badge: "Unverified", badgeColor: "text-warning" },
    { icon: CreditCard, label: "Bank Accounts", description: "Manage withdrawal accounts", onClick: () => navigate("/banks") },
    { icon: Bell, label: "Notifications", description: "Manage alerts" },
    { icon: HelpCircle, label: "Help & Support", description: "Get help" },
    { icon: FileText, label: "Terms & Privacy", description: "Legal documents" },
  ];

  const stats = [
    { label: "Total Funded", value: transactions.filter((t) => t.type === "credit" && t.status === "success").reduce((sum, t) => sum + t.amount, 0) },
    { label: "Total Withdrawn", value: transactions.filter((t) => t.type === "debit" && t.status === "success").reduce((sum, t) => sum + t.amount, 0) },
    { label: "Transactions", value: transactions.length, isCount: true },
  ];

  return (
    <div className="page-container">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground font-display">Profile</h1>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-primary font-display">
              {(user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-0.5 font-display">{user?.user_metadata?.full_name || "User"}</h2>
          <p className="text-xs text-muted-foreground mb-3">{user?.email}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
            <Shield className="w-3 h-3" />Unverified
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        <section className="grid grid-cols-3 gap-2">
          {stats.map((stat, index) => (
            <div key={stat.label} className="bg-card rounded-2xl p-3 border border-border text-center animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}>
              <p className="text-sm font-bold text-foreground font-number">
                {stat.isCount ? stat.value : formatCurrency(stat.value)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <button key={item.label} onClick={item.onClick}
              className={cn("w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left",
                index !== menuItems.length - 1 && "border-b border-border")}>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">{item.label}</p>
                  {item.badge && <span className={cn("text-[10px] font-medium", item.badgeColor)}>{item.badge}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </section>

        <Button variant="outline" size="lg"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />Sign Out
        </Button>

        <p className="text-center text-[10px] text-muted-foreground pb-4">YOMI PAY v1.0.0</p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
