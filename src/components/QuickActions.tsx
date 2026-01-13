import { Plus, ArrowUpRight, History, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: "Fund Wallet",
      description: "Add money",
      onClick: () => navigate("/fund"),
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: ArrowUpRight,
      label: "Withdraw",
      description: "To bank",
      onClick: () => navigate("/withdraw"),
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      icon: History,
      label: "History",
      description: "Transactions",
      onClick: () => navigate("/transactions"),
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: CreditCard,
      label: "Banks",
      description: "Manage",
      onClick: () => navigate("/banks"),
      gradient: "from-orange-500 to-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="quick-action group animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className={`quick-action-icon bg-gradient-to-br ${action.gradient} group-hover:scale-110 transition-transform duration-300`}>
            <action.icon className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground">{action.label}</p>
            <p className="text-[10px] text-muted-foreground">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
