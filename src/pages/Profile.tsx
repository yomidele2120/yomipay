import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  LogOut,
  ChevronRight,
  Bell,
  HelpCircle,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { wallet, transactions } = useWallet();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    {
      icon: Shield,
      label: "KYC Verification",
      description: "Verify your identity",
      badge: "Unverified",
      badgeColor: "text-warning",
    },
    {
      icon: CreditCard,
      label: "Bank Accounts",
      description: "Manage withdrawal accounts",
      onClick: () => navigate("/banks"),
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage alerts",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "Get help",
    },
    {
      icon: FileText,
      label: "Terms & Privacy",
      description: "Legal documents",
    },
  ];

  const stats = [
    {
      label: "Total Funded",
      value: transactions
        .filter((t) => t.type === "credit" && t.status === "success")
        .reduce((sum, t) => sum + t.amount, 0),
    },
    {
      label: "Total Withdrawn",
      value: transactions
        .filter((t) => t.type === "debit" && t.status === "success")
        .reduce((sum, t) => sum + t.amount, 0),
    },
    {
      label: "Transactions",
      value: transactions.length,
      isCount: true,
    },
  ];

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
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-6 border border-border text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-primary">
              {(user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {user?.user_metadata?.full_name || "User"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium">
            <Shield className="w-4 h-4" />
            Unverified
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl p-4 border border-border text-center animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <p className="text-lg font-bold text-foreground font-number">
                {stat.isCount ? stat.value : formatCurrency(stat.value)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Menu */}
        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                "w-full p-4 flex items-center gap-4 hover:bg-muted transition-colors text-left",
                index !== menuItems.length - 1 && "border-b border-border"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  {item.badge && (
                    <span className={cn("text-xs font-medium", item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </section>

        {/* Sign Out */}
        <Button
          variant="outline"
          size="lg"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          YOMI PAY v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
