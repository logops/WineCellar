import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

const PageHeader = ({
  title,
  description,
  className,
  children,
}: PageHeaderProps) => {
  return (
    <div className={cn("mb-6 border-b border-border pb-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div className="mt-4 sm:mt-0">{children}</div>}
      </div>
    </div>
  );
};

export default PageHeader;