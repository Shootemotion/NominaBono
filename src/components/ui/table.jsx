import React from "react";

export function Table({ className = "", ...props }) {
  return <table className={["w-full text-sm", className].join(" ")} {...props} />;
}

export function TableHeader({ className = "", ...props }) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className = "", ...props }) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className = "", ...props }) {
  return <tr className={["border-b last:border-0", className].join(" ")} {...props} />;
}

export function TableHead({ className = "", ...props }) {
  return (
    <th
      className={["px-4 py-2 text-left font-medium text-muted-foreground", className].join(" ")}
      {...props}
    />
  );
}

export function TableCell({ className = "", ...props }) {
  return <td className={["px-4 py-2 align-middle", className].join(" ")} {...props} />;
}
