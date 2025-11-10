import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ObjetivosList({
  objetivos = [],
  loading = false,
  onCreate,
  onEdit,
  onDelete,
  createDisabled = false,
  totalPeso = 0,          // 👈 nuevo prop
}) {
  const over = totalPeso > 100;

  return (
    <div className="card p-4">
      <div className="title-row mb-2 items-end justify-between">
        <div>
          <h2 className="m-0">Configuración de Objetivos</h2>
          <div className={`mt-1 text-sm ${over ? 'text-red-600' : 'text-muted-foreground'}`}>
            Peso total asignado: <b>{totalPeso}%</b> {over && '· supera 100%'}
          </div>
        </div>
        <Button onClick={onCreate} disabled={createDisabled}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Objetivo
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-sm text-muted-foreground text-center">Cargando…</div>
      ) : objetivos.length === 0 ? (
        <div className="py-12 text-sm text-muted-foreground text-center">
          No hay objetivos definidos. Creá el primero.
        </div>
      ) : (
        <ul className="divide-y">
          {objetivos.map((o) => (
            <li key={o._id} className="py-3 flex items-start justify-between">
              <div>
                <div className="font-medium">{o.nombre}</div>
                {o.descripcion && <div className="text-sm text-muted-foreground">{o.descripcion}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  KPI: {o.kpi || '—'} · Target: {o.target || '—'} · Peso: {o.peso ?? 0}%
                  {o.fechaLimite ? ` · Vence: ${new Date(o.fechaLimite).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="btn-row">
                <Button variant="outline" size="sm" onClick={() => onEdit(o)}>Editar</Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(o._id)}>Eliminar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}