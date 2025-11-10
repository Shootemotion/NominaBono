export function Dialog({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children }) {
  return <div className="p-6">{children}</div>;
}

export function DialogHeader({ children }) {
  return <div className="border-b px-6 py-3">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}
