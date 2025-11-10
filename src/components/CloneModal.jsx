// src/components/CloneModal.jsx
import Modal from "@/components/Modal.jsx";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";

export default function CloneModal({
  isOpen,
  onClose,
  template,
  areas = [],
  sectores = [],
  empleados = [],          // ✅ nuevo: lista de empleados
  onClone,
}) {
  // Estado base
  const currentYear = new Date().getFullYear();
  const [newYear, setNewYear] = useState(template?.year || currentYear);
  const [newScopeType, setNewScopeType] = useState(template?.scopeType || "sector"); // "sector" | "area" | "empleado"
  const [newScopeId, setNewScopeId] = useState("");

  // 🔎 Typeahead empleado
  const [empQuery, setEmpQuery] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const empBoxRef = useRef(null);

  const selectedEmpleado = useMemo(
    () => empleados.find((e) => String(e._id) === String(newScopeId)) || null,
    [empleados, newScopeId]
  );

  const empleadosFiltrados = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    if (!q) return empleados.slice(0, 15);
    return empleados
      .filter((e) => {
        const n = `${e?.apellido ?? ""} ${e?.nombre ?? ""}`.toLowerCase();
        const a = (e?.apodo ?? "").toLowerCase();
        return n.includes(q) || a.includes(q);
      })
      .slice(0, 20);
  }, [empQuery, empleados]);

  // Cerrar dropdown al click afuera
  useEffect(() => {
    function handleClickOutside(ev) {
      if (empBoxRef.current && !empBoxRef.current.contains(ev.target)) {
        setEmpOpen(false);
      }
    }
    if (empOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [empOpen]);

  // Reset al abrir/cambiar template
  useEffect(() => {
    if (!isOpen) return;
    setNewYear(template?.year || currentYear);
    setNewScopeType(template?.scopeType || "sector");
    setNewScopeId("");
    setEmpQuery("");
    setEmpOpen(false);
  }, [isOpen, template, currentYear]);

  if (!template) return null;

  const canSubmit = !!newScopeId && Number(newYear) >= currentYear - 5 && Number(newYear) <= currentYear + 5;
  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Clonar: ${template.nombre}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Año */}
          <div>
            <label className="text-xs text-muted-foreground">Año destino</label>
            <input
              type="number"
              value={newYear}
              min={currentYear - 5}
              max={currentYear + 5}
              onChange={(e) => setNewYear(Number(e.target.value || currentYear))}
              className={inputCls}
            />
          </div>

          {/* Alcance */}
          <div>
            <label className="text-xs text-muted-foreground">Alcance</label>
            <select
              value={newScopeType}
              onChange={(e) => {
                setNewScopeType(e.target.value);
                setNewScopeId("");
                setEmpQuery("");
                setEmpOpen(false);
              }}
              className={inputCls}
            >
              <option value="sector">Sector</option>
              <option value="area">Área</option>
              <option value="empleado">Empleado</option> {/* ✅ nuevo */}
            </select>
          </div>

          {/* Destino */}
          <div>
            <label className="text-xs text-muted-foreground">Destino</label>

            {/* Sector */}
            {newScopeType === "sector" && (
              <select
                value={newScopeId}
                onChange={(e) => setNewScopeId(e.target.value)}
                className={inputCls}
              >
                <option value="">Seleccioná sector…</option>
                {sectores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            )}

            {/* Área */}
            {newScopeType === "area" && (
              <select
                value={newScopeId}
                onChange={(e) => setNewScopeId(e.target.value)}
                className={inputCls}
              >
                <option value="">Seleccioná área…</option>
                {areas.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            )}

            {/* Empleado (typeahead) */}
            {newScopeType === "empleado" && (
              <div ref={empBoxRef}>
                {selectedEmpleado ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">
                      {selectedEmpleado.apellido}, {selectedEmpleado.nombre}
                      {selectedEmpleado.apodo ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({selectedEmpleado.apodo})
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => {
                        setNewScopeId("");
                        setEmpQuery("");
                        setEmpOpen(true);
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className={inputCls}
                      placeholder="Buscar por apellido, nombre o apodo…"
                      value={empQuery}
                      onChange={(e) => {
                        setEmpQuery(e.target.value);
                        setEmpOpen(true);
                      }}
                      onFocus={() => setEmpOpen(true)}
                    />
                    {empOpen && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow">
                        {empleadosFiltrados.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Sin resultados
                          </div>
                        )}
                        {empleadosFiltrados.map((e) => (
                          <button
                            key={e._id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => {
                              setNewScopeId(String(e._id));
                              setEmpOpen(false);
                            }}
                          >
                            {e.apellido}, {e.nombre}
                            {e.apodo ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({e.apodo})
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Escribí para buscar y seleccioná al empleado.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onClone({ year: newYear, scopeType: newScopeType, scopeId: newScopeId })
            }
            disabled={!canSubmit}
          >
            Clonar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
