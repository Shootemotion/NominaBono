import React from "react";

export const Textarea = React.forwardRef(function Textarea(
  { className = "", invalid = false, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={[
        "w-full min-h-24 rounded-md border border-border bg-background",
        "px-3 py-2 text-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
        invalid ? "ring-2 ring-destructive border-destructive" : "",
        className,
      ].join(" ")}
      {...props}
    />
  );
});
