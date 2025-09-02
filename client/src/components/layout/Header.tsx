import { Bell, LogOut, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();
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
  
  // Get username from email (part before @)
  const username = user?.email ? user.email.split('@')[0] : "User";
  
  return (
    <div className="bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>
      
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 hover:bg-blue-50 transition-colors">
              <User size={18} className="text-primary" />
              <span className="font-medium text-gray-700 hidden sm:inline-block">{username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium text-gray-700 truncate">{username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer flex items-center text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
