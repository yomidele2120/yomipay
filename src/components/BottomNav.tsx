import { Home, Wallet, History, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Wallet, label: "Wallet", path: "/fund" },
    { icon: History, label: "History", path: "/transactions" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn("bottom-nav-item", isActive && "active")}
            >
              <item.icon className={cn("w-6 h-6", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
