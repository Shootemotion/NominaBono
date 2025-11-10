// src/pages/Forbidden.jsx
export default function Forbidden() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2">403 • Sin permiso</h1>
        <p className="text-muted-foreground">
          No tenés acceso a esta sección.
        </p>
      </div>
    </div>
  );
}
