import { Outlet, Navigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useApp } from "@/contexts/AppContext";

export default function Layout() {
  const { isLoggedIn } = useApp();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      {/* Di HP sidebar jadi drawer overlay, jadi main bisa full width */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen w-full lg:w-auto">
        <div className="flex-1"><Outlet /></div>
      </main>
    </div>
  );
}