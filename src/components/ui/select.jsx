import React from "react";

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-11 px-4 text-base",
};

export const Select = React.forwardRef(function Select(
  { className = "", size = "md", invalid = false, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[
        "w-full rounded-md border border-border bg-background",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
        invalid ? "ring-2 ring-destructive border-destructive" : "",
        "appearance-none pr-8", // deja espacio si luego quieres ícono de chevron
        sizes[size] ?? sizes.md,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
  );
});
