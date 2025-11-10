import React from "react";

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-11 px-4 text-base",
};

export const Input = React.forwardRef(function Input(
  { className = "", size = "md", invalid = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[
        "w-full rounded-md border border-border bg-background",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
        invalid ? "ring-2 ring-destructive border-destructive" : "",
        sizes[size] ?? sizes.md,
        className,
      ].join(" ")}
      {...props}
    />
  );
});
