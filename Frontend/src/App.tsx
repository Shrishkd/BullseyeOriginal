import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import Predictions from "./pages/Predictions";
import Portfolio from "./pages/Portfolio";
import Risk from "./pages/Risk";
import News from "./pages/News";
import Alerts from "./pages/Alerts";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const stored = localStorage.getItem('theme-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      setTheme(parsed.state.theme);
    }
  }, [setTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/market" element={<Market />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/risk" element={<Risk />} />
              <Route path="/news" element={<News />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
