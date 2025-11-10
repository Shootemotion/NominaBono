import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function GanttEvaluaciones({
  empleados = [],
  selectedEmpleadoId,
  onUpdateHito,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [hitoSeleccionado, setHitoSeleccionado] = useState(null);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);

  const handleOpenModal = (hito, plantilla, empleadosAplicables) => {
    setHitoSeleccionado({ ...hito, plantilla });
    setEmpleadosSeleccionados(empleadosAplicables.map((e) => e._id));
    setModalOpen(true);
  };

  const handleToggleEmpleado = (id) => {
    setEmpleadosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!hitoSeleccionado) return;
    onUpdateHito?.(hitoSeleccionado, empleadosSeleccionados);
    setModalOpen(false);
  };

  // A quién aplica (alcance)
  const getDestino = (p, emp) => {
    const st = (p?.scopeType || p?.alcance || "").toLowerCase();
    if (st === "empleado") {
      const label = emp?.empleado
        ? `${emp.empleado.apellido}, ${emp.empleado.nombre}`
        : "Empleado";
      return { nivel: "Empleado", label };
    }
    if (st === "sector") {
      const nombre = emp?.empleado?.sector?.nombre || p?.scopeName || "Sector";
      return { nivel: "Sector", label: nombre };
    }
    if (st === "area" || st === "área") {
      const nombre = emp?.empleado?.area?.nombre || p?.scopeName || "Área";
      return { nivel: "Área", label: nombre };
    }
    if (emp?.empleado?.sector?.nombre) return { nivel: "Sector", label: emp.empleado.sector.nombre };
    if (emp?.empleado?.area?.nombre) return { nivel: "Área", label: emp.empleado.area.nombre };
    return { nivel: "—", label: "—" };
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Nombre</th>
            <th className="px-3 py-2 text-left">Área/Sector</th>
            <th className="px-3 py-2 text-left">Aplica a</th>
            {!selectedEmpleadoId && <th className="px-3 py-2 text-left">Empleado</th>}
            <th className="px-3 py-2 text-left">Hitos</th>
          </tr>
        </thead>
        <tbody>
          {empleados.flatMap((emp) =>
            [...(emp.objetivos?.items || []), ...(emp.aptitudes?.items || [])].map((p) => (
              <tr key={`${emp.empleado._id}-${p._id}`} className="border-t">
                <td className="px-3 py-2">{p.tipo === "objetivo" ? "🎯 Objetivo" : "💡 Aptitud"}</td>
                <td className="px-3 py-2">{p.nombre}</td>
                <td className="px-3 py-2">
                  {emp.empleado.sector?.nombre || emp.empleado.area?.nombre || "—"}
                </td>
                <td className="px-3 py-2">
                  {(() => {
                    const dst = getDestino(p, emp);
                    return (
                      <span className="inline-flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] ring-1 ring-border bg-background/60">
                          {dst.nivel}
                        </span>
                        <span className="text-xs text-muted-foreground">{dst.label}</span>
                      </span>
                    );
                  })()}
                </td>
                {!selectedEmpleadoId && (
                  <td className="px-3 py-2">
                    {emp.empleado.apellido}, {emp.empleado.nombre}
                  </td>
                )}
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {p.hitos?.map((h, idx) => {
                      const cumplido = Number(h.real) >= Number(h.meta ?? h.target ?? Infinity);
                      const vencido = new Date(h.fecha) < new Date() && !cumplido;
                      return (
                        <div
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs cursor-pointer ${
                            cumplido
                              ? "bg-green-500 text-white"
                              : vencido
                              ? "bg-red-500 text-white"
                              : "bg-yellow-500 text-black"
                          }`}
                          onClick={() => handleOpenModal(h, p, [emp.empleado])}
                          title={`Meta: ${h.meta ?? "—"} / Real: ${h.real ?? "—"} · ${h.periodo}`}
                        >
                          {h.periodo} ({h.meta ?? "—"}% / {h.real ?? "—"}%)
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Actualizar hito</DialogTitle>
          </DialogHeader>

          {hitoSeleccionado && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{hitoSeleccionado.plantilla?.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {hitoSeleccionado.periodo} · {hitoSeleccionado.fecha}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium">Resultado real</label>
                <input
                  type="number"
                  defaultValue={hitoSeleccionado.real || ""}
                  className="border rounded px-2 py-1 w-full text-sm"
                  onChange={(e) =>
                    setHitoSeleccionado({ ...hitoSeleccionado, real: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Aplicar a empleados</label>
                {empleados.map((emp) => (
                  <div key={emp.empleado._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={empleadosSeleccionados.includes(emp.empleado._id)}
                      onChange={() => handleToggleEmpleado(emp.empleado._id)}
                    />
                    <span className="text-sm">
                      {emp.empleado.apellido}, {emp.empleado.nombre}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
