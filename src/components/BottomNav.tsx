import { Home, Wallet, History, User, ArrowLeftRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Wallet, label: "Wallet", path: "/fund" },
    { icon: ArrowLeftRight, label: "", path: "/withdraw", isCenter: true },
    { icon: History, label: "History", path: "/transactions" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-12 h-12 -mt-4 rounded-full bg-primary flex items-center justify-center shadow-button transition-transform hover:scale-105"
              >
                <item.icon className="w-5 h-5 text-primary-foreground" />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn("bottom-nav-item", isActive && "active")}
            >
              <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
