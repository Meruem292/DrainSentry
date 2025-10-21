"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/icons/logo";
import { useAuth } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { FirebaseClientProvider } from "@/firebase/client-provider";

function SignupPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const router = useRouter();
  const { auth } = useAuth();
  const { toast } = useToast();

  const handleSignup = async () => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service is not available.",
      });
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // You can add logic here to save the full name to your database
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/">
                <Logo className="h-10 w-auto text-primary" />
            </Link>
          </div>
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input 
                id="full-name" 
                placeholder="Max Robinson" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleSignup} className="w-full">
              Create account
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <FirebaseClientProvider>
      <SignupPageContent />
    </FirebaseClientProvider>
  )
}
