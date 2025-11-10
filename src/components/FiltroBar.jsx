// src/components/FiltroBar.jsx
import { Button } from "@/components/ui/button";

export default function FiltroBar({
  year, setYear,
  scopeType, setScopeType,
  scopeId, setScopeId,
  tipoFiltro, setTipoFiltro,
  areas = [], sectores = [],
  onNew,
  canCreateObjetivo,
  canCreateAptitud
}) {
  const canCreateForFilter = tipoFiltro === "todos"
    ? (canCreateObjetivo || canCreateAptitud)
    : (tipoFiltro === "objetivo" ? canCreateObjetivo : canCreateAptitud);

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Año</label>
          <input type="number" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                 value={year} onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))} />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Alcance</label>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={scopeType} onChange={(e) => { setScopeType(e.target.value); setScopeId(""); }}>
            <option value="sector">Sector</option>
            <option value="area">Área</option>
          </select>
        </div>

        {scopeType === "sector" ? (
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Sector</label>
            <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">Seleccioná…</option>
              {sectores.map(s => <option key={s._id} value={s._id}>{s.nombre}</option>)}
            </select>
          </div>
        ) : (
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Área</label>
            <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">Seleccioná…</option>
              {areas.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground block">Tipo</label>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {["todos","objetivo","aptitud"].map(opt => (
              <button key={opt}
                      className={`px-3 py-2 text-sm transition-colors ${tipoFiltro === opt ? "bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                      onClick={() => setTipoFiltro(opt)} type="button">
                {opt === "todos" ? "Todos" : (opt === "objetivo" ? "Objetivos" : "Competencias")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-end">
          <Button onClick={onNew} disabled={!scopeId || !canCreateForFilter}
                  title={!scopeId ? "Seleccioná un alcance primero" : (!canCreateForFilter ? "No tenés permisos" : "")}>
            + Nueva plantilla
          </Button>
        </div>
      </div>
    </div>
  );
}
