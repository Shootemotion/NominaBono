// src/components/NoAccess.jsx
import React from 'react';
// src/components/NoAccess.jsx
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NoAccess({ message = 'No tenés los permisos necesarios para ver esta sección.' }) {
  const nav = useNavigate();
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-md text-center rounded-lg border bg-card p-6 shadow">
        <h2 className="text-lg font-semibold mb-2">Sin permisos</h2>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => nav(-1)}>Volver</Button>
          <Button onClick={() => {
            // Si tenés un flujo para solicitar acceso podés abrir modal o enviar request.
            // Por ahora solo redirige a inicio.
            nav('/');
          }}>
            Solicitar acceso
          </Button>
        </div>
      </div>
    </div>
  );
}
