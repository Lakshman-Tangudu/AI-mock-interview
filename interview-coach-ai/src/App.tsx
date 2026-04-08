import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InterviewProvider } from "@/contexts/InterviewContext";
import AppLayout from "@/components/layouts/AppLayout";
import FlowLayout from "@/components/layouts/FlowLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import InterviewSetup from "@/pages/InterviewSetup";
import SystemCheck from "@/pages/SystemCheck";
import MockInterview from "@/pages/MockInterview";
import Processing from "@/pages/Processing";
import Feedback from "@/pages/Feedback";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      {/* Sidebar layout pages */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Flow layout pages */}
      <Route element={<ProtectedRoute><FlowLayout /></ProtectedRoute>}>
        <Route path="/setup" element={<InterviewSetup />} />
        <Route path="/system-check" element={<SystemCheck />} />
        <Route path="/interview" element={<MockInterview />} />
        <Route path="/processing" element={<Processing />} />
        <Route path="/feedback/:id" element={<Feedback />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <InterviewProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </InterviewProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
