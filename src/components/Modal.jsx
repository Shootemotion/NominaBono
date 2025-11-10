// src/components/Modal.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  xxl: "max-w-6xl",
};

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const closeOnBackdrop = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  return createPortal(
    <div
      ref={overlayRef}
      onMouseDown={closeOnBackdrop}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-[1px] p-4 sm:pt-20"
      aria-modal="true"
      role="dialog"
    >
      <div
  ref={panelRef}
  className={`w-full ${sizeClass} rounded-2xl border bg-card text-card-foreground shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95`}
>
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
    <h3 className="text-lg font-semibold">{title}</h3>
    <button
      onClick={onClose}
      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
      aria-label="Cerrar"
    >
      <X className="h-4 w-4" />
    </button>
  </div>

  {/* Contenido scrollable */}
  <div className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-4">{children}</div>
</div>

    </div>,
    document.body
  );
}
