import { Toaster } from "@/components/ui/toaster.jsx";
import { Toaster as Sonner } from "@/components/ui/sonner.jsx";
import { TooltipProvider } from "@/components/ui/tooltip.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AppProvider, useApp } from "@/contexts/AppContext.jsx";
import { SettingsProvider } from "@/contexts/SettingsContext.jsx";
import AppLayout from "@/components/layout/Layout.jsx";

import HomePage from "@/pages/HomePage.jsx";
import LoginPage from "@/pages/LoginPage.jsx";
import SignUpPage from "@/pages/SignUpPage.jsx";
import DashboardPage from "@/pages/DashboardPage.jsx";
import UploadPage from "@/pages/UploadPage.jsx";
import ArchivePage from "@/pages/ArchivePage.jsx";
import ApprovalPendingPage from "@/pages/ApprovalPendingPage.jsx";
import ApprovalApprovedPage from "@/pages/ApprovalApprovedPage.jsx";
import RoleManagementPage from "@/pages/RoleManagementPage.jsx";
import UserManagementPage from "@/pages/UserManagementPage.jsx";
import LogPage from "@/pages/LogPage.jsx";
import SettingsPage from "@/pages/SettingsPage.jsx";
import ProfilePage from "@/pages/ProfilePage.jsx";
import ChangePasswordPage from "@/pages/ChangePasswordPage.jsx";
import HomeDashboardPage from "@/pages/HomeDashboardPage.jsx";
import TrashPage from "@/pages/TrashPage.jsx";
import NotFound from "./pages/NotFound.jsx";

import ChatBot from "@/components/chatbot/ChatBot";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { isLoggedIn, authLoading, currentUser } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat sesi…</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (
    currentUser?.mustChangePassword &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isLoggedIn, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* =========================================================
          PUBLIC ROUTES

          "/" = Home / Landing Page SAKURA dengan Sakura petals.
          Ini adalah "Home Page" sebelum user masuk ke sistem.
      ========================================================= */}

      <Route
        path="/"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <HomePage />
          )
        }
      />

      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/signup"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SignUpPage />
          )
        }
      />

      {/* =========================================================
          PROTECTED ROUTES
      ========================================================= */}

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard utama setelah login */}
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        {/* Tentang SAKURA / informasi sistem dan sekolah */}
        <Route
          path="/about"
          element={<HomeDashboardPage />}
        />

        {/* Redirect URL lama agar tidak error */}
        <Route
          path="/home"
          element={<Navigate to="/about" replace />}
        />

        <Route
          path="/upload"
          element={<UploadPage />}
        />

        <Route
          path="/archive"
          element={<ArchivePage />}
        />

        <Route
          path="/approval"
          element={<Navigate to="/approval/pending" replace />}
        />

        <Route
          path="/approval/pending"
          element={<ApprovalPendingPage />}
        />

        <Route
          path="/approval/approved"
          element={<ApprovalApprovedPage />}
        />

        <Route
          path="/users"
          element={<UserManagementPage />}
        />

        <Route
          path="/roles"
          element={<RoleManagementPage />}
        />

        <Route
          path="/logs"
          element={<LogPage />}
        />

        <Route
          path="/trash"
          element={<TrashPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="/profile"
          element={<ProfilePage />}
        />

        <Route
          path="/change-password"
          element={<ChangePasswordPage />}
        />
      </Route>

      <Route
        path="*"
        element={<NotFound />}
      />
    </Routes>
  );
}

function AppWithSettings() {
  return (
    <SettingsProvider>
      <AppRoutes />
    </SettingsProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <AppProvider>
          <AppWithSettings />
          <ChatBot />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;