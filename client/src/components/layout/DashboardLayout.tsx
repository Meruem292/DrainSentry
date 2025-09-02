import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ 
  children, 
  title, 
  subtitle 
}: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return (
    <div className="flex h-screen bg-[#F5F7FA]">
      {/* Sidebar for larger screens */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 md:pb-6">
          {subtitle && (
            <div className="mb-4 text-gray-600">{subtitle}</div>
          )}
          {children}
        </main>
        
        {/* Mobile bottom navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200">
          <Sidebar mobile={true} />
        </div>
      </div>
    </div>
  );
}
