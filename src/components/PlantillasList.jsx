// src/components/PlantillasList.jsx
import { Button } from "@/components/ui/button";

export default function PlantillasList({
  plantillas = [],
  onEdit,
  onClone,
  onDelete,
  permisos,
}) {
  if (!plantillas.length) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No hay plantillas para este filtro. Probá limpiar filtros (Año/Alcance) o revisar que existan plantillas para el año seleccionado.
      </div>
    );
  }

  return (
    <ul className="space-y-2 p-3">
      {plantillas.map((p) => {
        const isObj = p.tipo === "objetivo";
        const canEdit = isObj
          ? permisos?.canEditObjetivo
          : permisos?.canEditAptitud;
        const canDelete = isObj
          ? permisos?.canDeleteObjetivo
          : permisos?.canDeleteAptitud;

        const metasCount =
          isObj && Array.isArray(p.metas) ? p.metas.length : null;
        const peso = p.pesoBase ?? 0;
        const metodo = p.metodo || "—";
        const proceso = p.proceso || "—";
        const frecuencia = p.frecuencia || p.frequency || "—";
        const activo = p.activo !== false; // por defecto activo si no existe

        // clase común para TODAS las “píldoras” para que queden del mismo alto
        const pill = "inline-flex items-center h-6 px-2 rounded-full text-[11px] ring-1";

        return (
          <li
            key={p._id}
            className="group rounded-md border border-border bg-background/80 px-3 py-3 ring-1 ring-border/60 hover:bg-primary/5 hover:ring-primary/20 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Izquierda */}
              <div className="min-w-0">
                {/* Título */}
                <div className="font-semibold truncate">{p.nombre}</div>

                {/* Píldoras principales bajo el título */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Tipo (OBJ/APT) */}
                  <span className={`${pill} bg-primary/10 text-primary ring-primary/20`}>
                    {isObj ? "OBJ" : "APT"}
                  </span>

                  {/* Meta count (solo objetivos) */}
                  {metasCount !== null && (
                    <span className={`${pill} bg-sky-100 text-sky-700 ring-sky-200`}>
                      {metasCount} metas
                    </span>
                  )}

                  {/* Peso */}
                  <span className={`${pill} bg-blue-50 text-blue-700 ring-blue-100`}>
                    {peso}% peso
                  </span>

                  {/* Estado */}
                  <span
                    className={`${pill} ${
                      activo
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-gray-100 text-gray-600 ring-gray-200"
                    }`}
                  >
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {/* Atributos (rings chicos y uniformes) */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <span className={`${pill} bg-background/60 ring-border/60`}>
                    Frecuencia: <span className="ml-1 text-foreground">{frecuencia}</span>
                  </span>
                  <span className={`${pill} bg-background/60 ring-border/60`}>
                    Proceso: <span className="ml-1 text-foreground">{proceso}</span>
                  </span>
                  <span className={`${pill} bg-background/60 ring-border/60`}>
                    Método: <span className="ml-1 text-foreground">{metodo}</span>
                  </span>
                </div>
              </div>

              {/* Acciones (sólo en hover) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-sky-100 text-sky-700 hover:bg-sky-200 border-0"
                  onClick={() => onEdit?.(p)}
                  disabled={!canEdit}
                  title={!canEdit ? "No tenés permisos para editar" : ""}
                >
                  Editar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0"
                  onClick={() => onClone?.(p)}
                >
                  Clonar
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-0"
                  onClick={() => onDelete?.(p)}
                  disabled={!canDelete}
                  title={!canDelete ? "No tenés permisos para eliminar" : ""}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
