"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode;
}

const TooltipProvider: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      ref,
      className: cn(children.props.className, className),
    });
  }
  
  return (
    <div ref={ref} className={cn("inline-block", className)} {...props}>
      {children}
    </div>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  sideOffset?: number;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 hidden group-hover:block",
          "px-3 py-1.5 text-xs rounded-md",
          "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
          "top-full mt-1 left-1/2 -translate-x-1/2",
          "max-w-xs",
          className
        )}
        {...props}
      >
        {children}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-100" />
      </div>
    );
  }
);
TooltipContent.displayName = "TooltipContent";

// Simple CSS-based tooltip implementation for now
export const SimpleTooltip: React.FC<{
  content: string;
  children: React.ReactNode;
}> = ({ content, children }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute z-50 hidden group-hover:block px-3 py-1.5 text-xs rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
        {content}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-100" />
      </div>
    </div>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }