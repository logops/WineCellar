import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  heading,
  subheading,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
      {subheading && (
        <p className="text-muted-foreground">{subheading}</p>
      )}
      {children}
    </div>
  );
}