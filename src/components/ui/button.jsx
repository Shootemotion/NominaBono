// src/components/ui/button.jsx
import React from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] shadow-sm",
  secondary:
    "bg-secondary text-foreground hover:bg-muted/70 border border-border",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-muted/50",
  ghost:
    "bg-transparent text-foreground hover:bg-muted/50",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-red-600",
};

const sizes = {
  sm: "h-8 px-3",
  md: "h-9 px-4",
  lg: "h-10 px-5 text-[15px]",
};

export function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  return (
    <Comp
      className={twMerge(clsx(base, variants[variant], sizes[size], className))}
      {...props}
    />
  );
}
