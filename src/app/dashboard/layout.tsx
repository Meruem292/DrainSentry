
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Settings, LogOut, Droplet, Trash2, Server, Users, Power, User } from "lucide-react";
import Logo from "@/components/icons/logo";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useEffect } from "react";
import { FirebaseClientProvider } from "@/firebase/client-provider";


function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = useAuth();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const getHeaderText = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/devices')) return 'Devices';
    if (pathname.startsWith('/dashboard/water-levels')) return 'Water Levels';
    if (pathname.startsWith('/dashboard/waste-bins')) return 'Waste Bins';
    if (pathname.startsWith('/dashboard/contacts')) return 'Contacts';
    if (pathname.startsWith('/dashboard/conveyor')) return 'Conveyor';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    return 'Dashboard';
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="p-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <Logo className="h-7 w-auto" />
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                <Link href="/dashboard"><LayoutDashboard /><span>Dashboard</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/water-levels")} tooltip="Water Levels">
                <Link href="#"><Droplet /><span>Water Levels</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/waste-bins")} tooltip="Waste Bins">
                <Link href="#"><Trash2 /><span>Waste Bins</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/devices")} tooltip="Devices">
                <Link href="/dashboard/devices"><Server /><span>Devices</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/contacts")} tooltip="Contacts">
                <Link href="/dashboard/contacts"><Users /><span>Contacts</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/conveyor")} tooltip="Conveyor">
                <Link href="#"><Power /><span>Conveyor</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings")} tooltip="Settings">
                    <Link href="#"><Settings /><span>Settings</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                    <LogOut /><span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-8">
            <h1 className="text-xl font-semibold font-headline">{getHeaderText()}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User size={16} />
                <span>{user.email}</span>
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-8 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <InnerDashboardLayout>{children}</InnerDashboardLayout>
    </FirebaseClientProvider>
  )
}
