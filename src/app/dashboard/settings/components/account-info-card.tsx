
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "firebase/auth";

interface AccountInfoCardProps {
  user: User | null;
}

const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base font-semibold">{value || "Not available"}</p>
  </div>
);

export default function AccountInfoCard({ user }: AccountInfoCardProps) {
  const creationDate = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : "N/A";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoRow label="Email Address" value={user?.email || undefined} />
        <InfoRow label="Account Type" value="Standard" />
        <InfoRow label="Account Created" value={creationDate} />
      </CardContent>
    </Card>
  );
}
