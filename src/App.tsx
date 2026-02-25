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
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import TicketsPage from "@/pages/TicketsPage";
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
  const isAdmin        = role === 'admin';
  const isAdminOrStaff = role === 'admin' || role === 'office_staff';
  const isTech         = role === 'engine_technician' || role === 'electrical_technician';
  const isStaffOrTech  = isAdminOrStaff || isTech;
  const isCustomer     = role === 'customer';

  // Helper: redirect unauthorized users to home
  const guard = (allowed: boolean, element: JSX.Element) =>
    allowed ? element : <Navigate to="/" replace />;

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* ── Universal ── */}
        <Route path="/"        element={<OverviewPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* ── Tickets: all roles see their own; techs see assigned; admins/staff see all ── */}
        <Route path="/tickets" element={<TicketsPage />} />

        {/* ── Assets: everyone except customer restriction is handled inside the page ── */}
        <Route path="/assets" element={<AssetsPage />} />

        {/* ── Manuals: admins, staff, technicians only ── */}
        <Route path="/manuals" element={guard(isStaffOrTech, <ManualsPage />)} />

        {/* ── Ask Felix: admin, staff, technicians only ── */}
        <Route path="/ask-ai" element={guard(!isCustomer, <AskAiPage />)} />

        {/* ── Admin + Office Staff only ── */}
        <Route path="/customers"    element={guard(isAdminOrStaff, <CustomersPage />)} />
        <Route path="/orders"       element={guard(isAdminOrStaff, <OrdersPage />)} />
        <Route path="/technicians"  element={guard(isAdminOrStaff, <TechniciansPage />)} />
        <Route path="/technicians/:id" element={guard(isAdminOrStaff, <TechnicianProfilePage />)} />
        <Route path="/staff"        element={guard(isAdminOrStaff, <StaffPage />)} />
        <Route path="/transactions" element={guard(isAdminOrStaff, <TransactionsPage />)} />
        <Route path="/logs"         element={guard(isAdminOrStaff, <LogsPage />)} />
        <Route path="/schedules"    element={<SchedulesPage />} />

        {/* ── Inventory: admin, staff, technicians ── */}
        <Route path="/components"  element={guard(isStaffOrTech, <ComponentsPage />)} />
        <Route path="/parts"       element={guard(isStaffOrTech, <PartsPage />)} />
        <Route path="/diagnostics" element={guard(isStaffOrTech, <DiagnosticsPage />)} />

        {/* ── AI Agents: admin, staff, technicians ── */}
        <Route path="/ai-agents" element={guard(isStaffOrTech, <AiAgentsPage />)} />

        {/* ── Admin-only settings re-uses logs page ── */}
        {/* Removed duplicate settings route - now available to all roles above */}

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
