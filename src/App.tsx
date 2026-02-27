import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { AiTutorProvider } from "@/context/AiTutorContext";
import { ThemeProvider } from "@/context/ThemeContext";

import DashboardLayout from "@/components/DashboardLayout";
import TechnicianLayout from "@/components/TechnicianLayout";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import TicketsPage from "@/pages/TicketsPage";
import TicketDetailPage from "@/pages/TicketDetailPage";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import CustomerDashboard from "@/pages/CustomerDashboard";
import TechniciansPage from "@/pages/TechniciansPage";
import TechnicianProfilePage from "@/pages/TechnicianProfilePage";
import OrdersPage from "@/pages/OrdersPage";
import LogsPage from "@/pages/LogsPage";
import ManualsPage from "@/pages/ManualsPage";
import CustomersPage from "@/pages/CustomersPage";
import ComponentsPage from "@/pages/ComponentsPage";
import PartsPage from "@/pages/PartsPage";
import AiAgentsPage from "@/pages/AiAgentsPage";
import ProfilePage from "@/pages/ProfilePage";
import DiagnosticsPage from "@/pages/DiagnosticsPage";
import AssetsPage from "@/pages/AssetsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import AskAiPage from "@/pages/AskAiPage";
import SettingsPage from "@/pages/SettingsPage";
import StaffPage from "@/pages/StaffPage";
import SchedulesPage from "@/pages/SchedulesPage";
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
  console.log('[ProtectedRoutes] user role:', role);
  const isAdmin        = role === 'admin';
  const isAdminOrStaff = role === 'admin' || role === 'office_staff';
  const isTech         = role === 'engine_technician' || role === 'electrical_technician' || role === 'tech';
  const isStaffOrTech  = isAdminOrStaff || isTech;
  const isCustomer     = role === 'customer';

  const guard = (allowed: boolean, element: JSX.Element) =>
    allowed ? element : <Navigate to="/" replace />;

  // Technician gets their own minimal layout
  if (isTech) {
    return (
      <Routes>
        <Route element={<TechnicianLayout />}>
          <Route path="/"             element={<TechnicianDashboard />} />
          <Route path="/tickets"      element={<TicketsPage />} />
          <Route path="/tickets/:id"  element={<TicketDetailPage />} />
          <Route path="/schedules"    element={<SchedulesPage />} />
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="/settings"     element={<SettingsPage />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Customer gets sidebar layout but customer-specific dashboard
  if (isCustomer) {
    return (
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/"            element={<CustomerDashboard />} />
          <Route path="/assets"      element={<AssetsPage />} />
          <Route path="/tickets"     element={<TicketsPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/ask-ai"      element={<AskAiPage />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Admin / Office Staff — full dashboard
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/"        element={<OverviewPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />

        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/manuals" element={guard(isAdminOrStaff, <ManualsPage />)} />
        <Route path="/ask-ai" element={<AskAiPage />} />

        <Route path="/customers"    element={<CustomersPage />} />
        <Route path="/orders"       element={<OrdersPage />} />
        <Route path="/technicians"  element={<TechniciansPage />} />
        <Route path="/technicians/:id" element={<TechnicianProfilePage />} />
        <Route path="/staff"        element={<StaffPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/logs"         element={<LogsPage />} />
        <Route path="/schedules"    element={<SchedulesPage />} />

        <Route path="/components"  element={<ComponentsPage />} />
        <Route path="/parts"       element={<PartsPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />

        <Route path="/ai-agents" element={guard(isAdmin, <AiAgentsPage />)} />

        <Route path="*" element={<NotFound />} />
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
      <ThemeProvider>
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
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
