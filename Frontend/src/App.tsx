import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { useThemeStore } from "@/stores/themeStore";
import DashboardLayout from "./components/DashboardLayout";

// Lazy-loaded page components for code splitting & faster initial paint
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Market = lazy(() => import("./pages/Market"));
const Predictions = lazy(() => import("./pages/Predictions"));
const Debate = lazy(() => import("./pages/Debate"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Risk = lazy(() => import("./pages/Risk"));
const News = lazy(() => import("./pages/News"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Chat = lazy(() => import("./pages/Chat"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Fallback spinner component during chunk load
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-xs text-muted-foreground animate-pulse">Loading Bullseye...</span>
    </div>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/market" element={<Market />} />
                <Route path="/predictions" element={<Predictions />} />
                <Route path="/debate" element={<Debate />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/risk" element={<Risk />} />
                <Route path="/news" element={<News />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
