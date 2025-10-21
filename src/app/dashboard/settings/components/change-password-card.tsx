"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ChangePasswordCardProps {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isChanging: boolean;
}

export default function ChangePasswordCard({ onChangePassword, isChanging }: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please ensure the new password and confirmation match.",
      });
      return;
    }
    if (newPassword.length < 6) {
        toast({
            variant: "destructive",
            title: "Password is too short",
            description: "Your new password must be at least 6 characters long.",
        });
        return;
    }

    onChangePassword(currentPassword, newPassword).then(() => {
        // Clear fields on success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    });
  };

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password here. It's recommended to use a strong, unique password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isChanging}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isChanging}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isChanging}
          />
        </div>
        <Button onClick={handleChangePassword} disabled={isChanging}>
          {isChanging ? "Changing..." : "Change Password"}
        </Button>
      </CardContent>
    </Card>
  );
}
