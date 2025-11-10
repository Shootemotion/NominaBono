import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ReferentesModal({
  tipo,            // 'area' | 'sector'
  entidad,         // { _id, nombre, referentes? }
  empleados = [],
  onCancel,
  onSave,
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());

  const [qFast, setQFast] = useState("");
  const [showFast, setShowFast] = useState(false);

  const itemRefs = useRef({});

  // pre-seleccionar
  useEffect(() => {
    const base = (entidad?.referentes || [])
      .map(r => (typeof r === "string" ? r : r?._id))
      .filter(Boolean);
    setSel(new Set(base));
  }, [entidad]);

  // ordenar
  const listaBase = useMemo(() => {
    let l = Array.isArray(empleados) ? [...empleados] : [];
    l.sort(
      (a, b) =>
        (a.apellido || "").localeCompare(b.apellido || "") ||
        (a.nombre || "").localeCompare(b.nombre || "")
    );
    return l;
  }, [empleados]);

  // filtro
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return listaBase;
    return listaBase.filter((e) => {
      const nom = `${e.apellido || ""} ${e.nombre || ""}`.toLowerCase();
      return (
        nom.includes(t) ||
        String(e.dni || "").includes(t) ||
        (e.puesto || "").toLowerCase().includes(t) ||
        (e.sector?.nombre || "").toLowerCase().includes(t) ||
        (e.area?.nombre || "").toLowerCase().includes(t)
      );
    });
  }, [listaBase, q]);

  // fast
  const fastSuggestions = useMemo(() => {
    const t = qFast.trim().toLowerCase();
    if (!t) return [];
    return listaBase.filter((e) => {
      const nom = `${e.apellido || ""} ${e.nombre || ""}`.toLowerCase();
      return (
        nom.includes(t) ||
        String(e.dni || "").includes(t) ||
        (e.puesto || "").toLowerCase().includes(t) ||
        (e.sector?.nombre || "").toLowerCase().includes(t) ||
        (e.area?.nombre || "").toLowerCase().includes(t)
      );
    }).slice(0, 6);
  }, [listaBase, qFast]);

  // toggle
  const toggle = (id) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectAllShown = () => setSel(new Set(lista.map((e) => e._id)));
  const clearAll = () => setSel(new Set());
  const handleSave = () => onSave(Array.from(sel));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            Referentes del {tipo === "area" ? "Área" : "Sector"}:{" "}
            <span className="text-muted-foreground">{entidad?.nombre}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Seleccioná los referentes desde la nómina disponible.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAllShown}>
            Seleccionar visibles
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Limpiar
          </Button>
        </div>
      </div>

      {/* Fast search */}
      <div className="relative">
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Búsqueda rápida (nombre, DNI, puesto…) "
          value={qFast}
          onChange={(e) => { setQFast(e.target.value); setShowFast(true); }}
          onFocus={() => qFast && setShowFast(true)}
        />
        {showFast && fastSuggestions.length > 0 && (
          <div className="absolute z-40 mt-1 w-full rounded-md border bg-card shadow-sm max-h-60 overflow-auto">
            {fastSuggestions.map((e) => (
              <div
                key={e._id}
                className="px-3 py-2 hover:bg-muted/40 cursor-pointer flex justify-between items-center"
                onClick={() => {
                  toggle(e._id);
                  setQFast("");
                  setShowFast(false);
                }}
              >
                <div>
                  <div className="font-medium">{e.apellido}, {e.nombre}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {e.puesto || "—"} · {e.sector?.nombre || e.area?.nombre || "—"} · {e.dni || ""}
                  </div>
                </div>
                <span className="text-sm">{sel.has(e._id) ? "✓" : "+"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buscador largo */}
      <div>
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Filtrar lista completa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Lista de empleados en 2 columnas */}
      <div className="max-h-[360px] overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lista.length === 0 ? (
          <div className="col-span-2 text-center text-sm text-muted-foreground p-4">
            Sin resultados
          </div>
        ) : (
          lista.map((e) => {
            const checked = sel.has(e._id);
            return (
              <label
                key={e._id}
                className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition hover:bg-muted/40 ${
                  checked ? "bg-accent/30 border-primary" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(e._id)}
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {e.apellido}, {e.nombre}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {e.puesto || "—"} · {e.sector?.nombre || e.area?.nombre || "—"} · {e.dni || ""}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {sel.size} referente(s) seleccionado(s)
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}
