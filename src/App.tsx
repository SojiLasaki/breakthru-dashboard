import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { AiTutorProvider } from "@/context/AiTutorContext";

import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import TicketsPage from "@/pages/TicketsPage";
import TechniciansPage from "@/pages/TechniciansPage";
import InventoryPage from "@/pages/InventoryPage";
import OrdersPage from "@/pages/OrdersPage";
import LogsPage from "@/pages/LogsPage";
import ManualsPage from "@/pages/ManualsPage";
import CustomersPage from "@/pages/CustomersPage";
import ComponentsPage from "@/pages/ComponentsPage";
import PartsPage from "@/pages/PartsPage";
import AiAgentsPage from "@/pages/AiAgentsPage";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role;
  const adminOrStaff   = role === 'admin' || role === 'office_staff';
  const techOrStaff    = adminOrStaff || role === 'engine_technician' || role === 'electrical_technician';

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/"            element={<OverviewPage />} />

        {/* Operations */}
        <Route path="/tickets"     element={<TicketsPage />} />
        <Route path="/customers"   element={adminOrStaff    ? <CustomersPage />    : <Navigate to="/" replace />} />
        <Route path="/orders"      element={adminOrStaff    ? <OrdersPage />       : <Navigate to="/" replace />} />
        <Route path="/technicians" element={adminOrStaff    ? <TechniciansPage />  : <Navigate to="/" replace />} />

        {/* Inventory & Parts */}
        <Route path="/inventory"   element={techOrStaff     ? <InventoryPage />    : <Navigate to="/" replace />} />
        <Route path="/components"  element={techOrStaff     ? <ComponentsPage />   : <Navigate to="/" replace />} />
        <Route path="/parts"       element={techOrStaff     ? <PartsPage />        : <Navigate to="/" replace />} />

        {/* Resources */}
        <Route path="/manuals"     element={<ManualsPage />} />
        <Route path="/ai-agents"   element={techOrStaff     ? <AiAgentsPage />     : <Navigate to="/" replace />} />
        <Route path="/logs"        element={adminOrStaff    ? <LogsPage />         : <Navigate to="/" replace />} />

        <Route path="*"            element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*"     element={<ProtectedRoutes />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <NotificationProvider>
          <AiTutorProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </AiTutorProvider>
        </NotificationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
