import React, { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

const AlertCtx = createContext(null);

// -----------------------------
// Provider
// -----------------------------
export function AlertDialog({ open, onOpenChange, children }) {
  const [internal, setInternal] = useState(false);

  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : internal;

  const setOpen = (v) => {
    if (!controlled) setInternal(v);
    if (onOpenChange) onOpenChange(v);
  };

  return (
    <AlertCtx.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </AlertCtx.Provider>
  );
}

// -----------------------------
// Trigger
// -----------------------------
export function AlertDialogTrigger({ asChild, children }) {
  const ctx = useContext(AlertCtx);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        if (children.props.onClick) children.props.onClick(e);
        ctx.setOpen(true);
      },
    });
  }

  return (
    <button onClick={() => ctx.setOpen(true)}>
      {children}
    </button>
  );
}

// -----------------------------
// Content (centro absoluto + portal)
// -----------------------------
export function AlertDialogContent({ children, className = "" }) {
  const ctx = useContext(AlertCtx);
  if (!ctx.open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => ctx.setOpen(false)}
      />

      {/* centro absoluto */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className={
            "w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 " +
            className
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// -----------------------------
// Subcomponentes UI
// -----------------------------
export function AlertDialogHeader({ children }) {
  return <div className="px-5 pt-5">{children}</div>;
}

export function AlertDialogTitle({ children }) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}

export function AlertDialogDescription({ children }) {
  return <p className="mt-1 text-sm text-slate-600">{children}</p>;
}

export function AlertDialogFooter({ children }) {
  return <div className="flex items-center justify-end gap-2 px-5 py-4">{children}</div>;
}

export function AlertDialogCancel({ children }) {
  const ctx = useContext(AlertCtx);
  return (
    <button
      onClick={() => ctx.setOpen(false)}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90"
    >
      {children}
    </button>
  );
}
