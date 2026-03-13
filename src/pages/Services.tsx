import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { BottomNav } from "@/components/BottomNav";
import { FullPageLoader } from "@/components/LoadingSpinner";
import { ArrowLeft, Phone, Wifi, Zap, Tv, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useEffect } from "react";

const Services = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <FullPageLoader />;

  const services = [
    {
      icon: Phone,
      label: "Buy Airtime",
      description: "Instant airtime for all networks",
      path: "/buy-airtime",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Wifi,
      label: "Buy Data",
      description: "Affordable data bundles",
      path: "/buy-data",
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      icon: Zap,
      label: "Electricity",
      description: "Pay electricity bills",
      path: "/buy-electricity",
      color: "bg-yellow-500/10 text-yellow-400",
    },
    {
      icon: Tv,
      label: "Cable TV",
      description: "DStv, GOtv, StarTimes",
      path: "/buy-cable",
      color: "bg-purple-500/10 text-purple-400",
    },
  ];

  return (
    <div className="page-container">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground font-display">Services</h1>
            <p className="text-xs text-muted-foreground">Buy airtime, data & pay bills</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">₦</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-lg font-bold text-foreground font-number">{formatCurrency(wallet?.balance || 0)}</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-3">
        {services.map((service, index) => (
          <button
            key={service.path}
            onClick={() => navigate(service.path)}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${service.color}`}>
              <service.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm text-foreground">{service.label}</p>
              <p className="text-xs text-muted-foreground">{service.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </main>

      <BottomNav />
    </div>
  );
};

export default Services;
