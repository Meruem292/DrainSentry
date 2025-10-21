import * as React from "react";
import { cn } from "@/lib/utils";

const Logo = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("font-bold text-2xl font-headline", className)} {...props}>
    <span style={{ color: 'hsl(var(--primary))' }}>Drain</span>
    <span style={{ color: 'hsl(var(--accent))' }}>Sentry</span>
  </div>
);

export default Logo;
