import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Droplet, 
  Trash2, 
  CircuitBoard, 
  Users, 
  Settings,
  LogOut 
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  mobile?: boolean;
}

export default function Sidebar({ mobile = false }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of DrainSentry",
      });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const isActive = (path: string) => {
    return location === path ? "active" : "";
  };
  
  const navItems = [
    { icon: <LayoutDashboard size={mobile ? 20 : 18} />, label: "Dashboard", path: "/" },
    { icon: <Droplet size={mobile ? 20 : 18} />, label: "Water Levels", path: "/water-levels" },
    { icon: <Trash2 size={mobile ? 20 : 18} />, label: "Waste Bins", path: "/waste-bins" },
    { icon: <CircuitBoard size={mobile ? 20 : 18} />, label: "Devices", path: "/devices" },
    { icon: <Users size={mobile ? 20 : 18} />, label: "Contacts", path: "/contacts" },
    { icon: <Settings size={mobile ? 20 : 18} />, label: "Settings", path: "/settings" }
  ];
  
  if (mobile) {
    return (
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a className={`flex flex-col items-center p-2 ${isActive(item.path) ? "text-primary" : "text-gray-500"}`}>
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    );
  }
  
  return (
    <div className="w-64 h-full bg-white shadow-md flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold">
          <span className="text-primary">Drain</span>
          <span className="text-secondary">Sentry</span>
        </h1>
      </div>
      
      <div className="flex-1 p-2">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a className={`sidebar-link ${isActive(item.path)}`}>
              <span className="mr-3 text-gray-500">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={handleSignOut}
          className="sidebar-link w-full text-gray-700"
        >
          <LogOut size={18} className="mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
