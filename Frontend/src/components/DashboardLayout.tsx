import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  TrendingUp,
  Brain,
  PieChart,
  ShieldAlert,
  Newspaper,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Market Data", url: "/market", icon: TrendingUp },
  { title: "Predictions", url: "/predictions", icon: Brain },
  { title: "Portfolio", url: "/portfolio", icon: PieChart },
  { title: "Risk Analysis", url: "/risk", icon: ShieldAlert },
  { title: "News", url: "/news", icon: Newspaper },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "AI Chat", url: "/chat", icon: MessageSquare },
  { title: "Settings", url: "/settings", icon: Settings },
];

function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <Sidebar>
      <SidebarContent className="glass-strong border-r border-border/50">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center">
            <img src="/favicon.ico" alt="Bullseye" className="h-10 w-10" />
          </div>
          <span className="text-xl font-bold gradient-text">Bullseye</span>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50 transition-smooth"
                      activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive transition-smooth"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Prevent rendering until auth is confirmed
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 glass-strong border-b border-border/50 flex items-center justify-between px-4 sticky top-0 z-40">
            <SidebarTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted transition-smooth"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SidebarTrigger>
            <ThemeToggle />
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
