import { Bell } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  
  return (
    <div className="bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>
      
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="relative mr-4">
          <Bell size={20} className="text-gray-500" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">1</span>
        </Button>
        
        <Avatar className="bg-primary text-white">
          <AvatarFallback>
            {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
