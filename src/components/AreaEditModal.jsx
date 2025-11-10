// src/components/AreaEditModal.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

/**
 * AreaEditModal - versión con columnas iguales y bloques alineados
 */
export default function AreaEditModal({
  area,
  empleados = [],
  initialTab = "datos",
  focusSectorId = null,
  onClose,
  onAreaUpdated,
  onSectorUpdated,
  onAreaDeleted,
  onSectorDeleted,
}) {
  const [tab, setTab] = useState(initialTab);
  const [nombre, setNombre] = useState(area?.nombre || "");
  const [saving, setSaving] = useState(false);

  // sectores del área
  const [sectores, setSectores] = useState([]);
  const [loadingSectores, setLoadingSectores] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSectores(true);
      try {
        const all = await api("/sectores");
        if (!mounted) return;
        const list = (all || []).filter(
          (s) => String(s?.areaId?._id || s?.areaId) === String(area._id)
        );
        setSectores(list);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los sectores del área.");
      } finally {
        setLoadingSectores(false);
      }
    })();
    return () => { mounted = false; };
  }, [area?._id]);

  // --- REFERENTES DE ÁREA ---
  const preSelArea = useMemo(() => {
    const ids = new Set((area?.referentes || []).map((r) => String(r?._id || r)));
    return ids;
  }, [area?.referentes]);

  const [selArea, setSelArea] = useState(() => new Set());
  useEffect(() => setSelArea(new Set(preSelArea)), [preSelArea]);

  const toggleAreaRef = (id) => {
    setSelArea((prev) => {
      const next = new Set(prev);
      const sid = String(id);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  };

  const saveAreaReferentes = async () => {
    try {
      const body = { referentes: Array.from(selArea) };
      const updated = await api(`/areas/${area._id}/referentes`, { method: "PUT", body });
      toast.success("Referentes de área guardados");
      onAreaUpdated?.(updated);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron guardar los referentes del área");
    }
  };

  // --- REFERENTES POR SECTOR ---
  const inicialSectorState = (s) => {
    const current = (s?.referentes || []).map((r) => String(r?._id || r));
    const hereda = current.length === 0; // vacío => hereda del área
    return { hereda, sel: new Set(current) };
  };

  const [sectorState, setSectorState] = useState({});
  useEffect(() => {
    const map = {};
    sectores.forEach((s) => (map[s._id] = inicialSectorState(s)));
    setSectorState(map);
  }, [sectores]);

  const setSectorHereda = (id, hereda) =>
    setSectorState((prev) => ({ ...prev, [id]: { ...prev[id], hereda } }));

  const toggleSectorRef = (sectorId, empId) =>
    setSectorState((prev) => {
      const st = prev[sectorId] || { hereda: true, sel: new Set() };
      const nextSel = new Set(st.sel);
      const sid = String(empId);
      nextSel.has(sid) ? nextSel.delete(sid) : nextSel.add(sid);
      return { ...prev, [sectorId]: { ...st, sel: nextSel } };
    });

  const saveOneSector = async (s) => {
    try {
      const st = sectorState[s._id] || { hereda: true, sel: new Set() };
      const body = {
        heredaReferentes: !!st.hereda,
        referentes: st.hereda ? [] : Array.from(st.sel),
      };
      const updated = await api(`/sectores/${s._id}/referentes`, { method: "PUT", body });
      toast.success(`Referentes guardados: ${s.nombre}`);
      onSectorUpdated?.(updated);
      setSectorState((prev) => ({ ...prev, [s._id]: { hereda: !!updated.heredaReferentes, sel: new Set((updated.referentes||[]).map(r=>String(r._id||r))) } }));
      setSectores((prev) => prev.map(x => x._id === updated._id ? updated : x));
    } catch (e) {
      console.error(e);
      toast.error(`No se pudieron guardar referentes de ${s.nombre}`);
    }
  };

  // --- DATOS DEL ÁREA ---
  const saveAreaDatos = async () => {
    try {
      setSaving(true);
      const updated = await api(`/areas/${area._id}`, { method: "PUT", body: { nombre } });
      toast.success("Área actualizada");
      onAreaUpdated?.(updated);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el área");
    } finally {
      setSaving(false);
    }
  };

  const deleteArea = async () => {
    if (!confirm("¿Eliminar esta área? Se validará que no tenga sectores/empleados.")) return;
    try {
      await api(`/areas/${area._id}`, { method: "DELETE" });
      toast.success("Área eliminada");
      onAreaDeleted?.(area._id);
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el área");
    }
  };

  // buscadores: qArea + qSectorMap
  const [qArea, setQArea] = useState("");
  const [qSectorMap, setQSectorMap] = useState({});
  const setQSector = (id, val) => setQSectorMap(prev => ({ ...prev, [id]: val }));

  const refsCount = (s) => (Array.isArray(s) ? s.length : (s ? s.size || 0 : 0));

  // helpers para filtrar empleados segun query
  const filterEmpleados = (q) => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return empleados;
    return empleados.filter(e => {
      const nom = `${e.apellido || ""} ${e.nombre || ""}`.toLowerCase();
      return nom.includes(t) || (e.dni || "").includes(t) || (e.puesto || "").toLowerCase().includes(t);
    });
  };

  // lista filtrada para AREA y para cada sector según su query
 // lista filtrada para AREA (selected arriba)
const listaAreaFiltered = useMemo(() => {
  const arr = filterEmpleados(qArea).slice(); // copia
  arr.sort((a, b) => {
    const aSel = selArea.has(String(a._id));
    const bSel = selArea.has(String(b._id));
    if (aSel === bSel) {
      // si ambos igual, ordenar por apellido/nombre
      const an = `${a.apellido||''} ${a.nombre||''}`.toLowerCase();
      const bn = `${b.apellido||''} ${b.nombre||''}`.toLowerCase();
      return an.localeCompare(bn);
    }
    return aSel ? -1 : 1; // seleccionado primero
  });
  return arr;
}, [qArea, empleados, selArea]);


  const sectorFiltered = (sectorId) => {
  const q = qSectorMap[sectorId] || "";
  const arr = filterEmpleados(q).slice();

  const st = sectorState[sectorId];
  const selSet = st?.sel || new Set();

  arr.sort((a, b) => {
    const aSel = selSet.has(String(a._id));
    const bSel = selSet.has(String(b._id));
    if (aSel === bSel) {
      const an = `${a.apellido||''} ${a.nombre||''}`.toLowerCase();
      const bn = `${b.apellido||''} ${b.nombre||''}`.toLowerCase();
      return an.localeCompare(bn);
    }
    return aSel ? -1 : 1;
  });

  return arr;
};

  return (
    <div className="space-y-4" size="XxL">
      {/* tabs */}
      <div className="flex gap-2">
        <Button variant={tab === "datos" ? "default" : "outline"} size="sm" onClick={() => setTab("datos")}>Datos del Área</Button>
        <Button variant={tab === "referentes" ? "default" : "outline"} size="sm" onClick={() => setTab("referentes")}>Referentes</Button>
      </div>

      {/* datos */}
      {tab === "datos" && (
        <div className="space-y-3">
          <label className="text-xs text-muted-foreground">Nombre del Área</label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNombre(area?.nombre || "")}>Revertir</Button>
            <Button onClick={saveAreaDatos} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      )}

      {/* referentes */}
      {tab === "referentes" && (
        <div className="space-y-4">
          {/* grid: izquierda = área, derecha = sectores (columnas iguales en lg) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IZQUIERDA: Referentes del Área */}
            <div className="h-full">
              <div className="flex items-center justify-between mb-2 min-h-[44px]">
                <div>
                  <div className="text-base font-medium">Referentes del Área</div>
                  <div className="text-xs text-muted-foreground">Estos referentes aplican por defecto a toda el área.</div>
                </div>
                <div className="text-sm text-muted-foreground">{refsCount(selArea)} seleccionado(s)</div>
              </div>

              <div className="rounded-md border p-3 bg-white flex flex-col h-full">
                <div className="mb-3">
                  <input
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    placeholder="Buscar en la nómina para el área..."
                    value={qArea}
                    onChange={(e) => setQArea(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 mb-3">
                  <Button variant="outline" onClick={() => {
                    // seleccionar visibles (filtrados por qArea)
                    setSelArea(new Set(listaAreaFiltered.map(e => String(e._id))));
                  }}>Seleccionar visibles</Button>
                  <Button variant="outline" onClick={() => setSelArea(new Set(preSelArea))}>Revertir selección</Button>
                </div>

                <div className="flex-1 max-h-[44vh] overflow-auto border rounded p-2">
                  {/* UNA COLUMNA para referentes del área */}
                  <div className="grid grid-cols-1 gap-2">
                    {listaAreaFiltered.map((e) => {
                      const id = String(e._id);
                      const checked = selArea.has(id);
                      return (
                        <label key={id} className={`flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer ${checked ? "bg-accent/50" : ""}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleAreaRef(id)} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{e.apellido}, {e.nombre}</div>
                            <div className="text-xs text-muted-foreground truncate">{e.puesto || "—"}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end mt-3 gap-2">
                  <Button variant="outline" onClick={() => setSelArea(new Set(preSelArea))}>Revertir</Button>
                  <Button onClick={saveAreaReferentes}>Guardar referentes de área</Button>
                </div>
              </div>
            </div>

            {/* DERECHA: Referentes por Sector (columna) */}
            <div>
              <div className="flex items-center justify-between mb-2 min-h-[44px]">
                <div className="text-base font-medium">Referentes por Sector</div>
                <div className="text-xs text-muted-foreground">{sectores.length} sector(es)</div>
              </div>

              <div className="space-y-4">
                {loadingSectores ? (
                  <div className="text-sm text-muted-foreground">Cargando sectores…</div>
                ) : sectores.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Esta área no tiene sectores.</div>
                ) : (
                  sectores.map((s) => {
                    const st = sectorState[s._id] || { hereda: true, sel: new Set() };
                    const filtered = sectorFiltered(s._id);
                    return (
                      <div key={s._id} className="rounded-md border p-3 bg-white flex flex-col h-full">
                        <div className="flex items-start justify-between mb-2 min-h-[44px]">
                          <div>
                            <div className="font-medium">{s.nombre}</div>
                            <div className="text-xs text-muted-foreground">Sector</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Referentes: {refsCount(st.sel)}</div>
                            <label className="text-xs inline-flex items-center gap-2">
                              <input type="checkbox" checked={!!st.hereda} onChange={(e) => setSectorHereda(s._id, e.target.checked)} />
                              <span className="text-xs">Hereda referentes del área</span>
                            </label>
                          </div>
                        </div>

                        {/* buscador del sector */}
                        <div className="mb-3">
                          <input
                            className="w-full rounded-md border border-border px-3 py-2 text-sm"
                            placeholder={`Buscar en ${s.nombre}...`}
                            value={qSectorMap[s._id] || ""}
                            onChange={(e) => setQSector(s._id, e.target.value)}
                            disabled={!!st.hereda}
                          />
                        </div>

                        {!st.hereda ? (
                          <>
                            <div className="mb-3 flex gap-2">
                              <Button variant="outline" onClick={() => {
                                setSectorState(prev => ({ ...prev, [s._id]: { ...(prev[s._id]||inicialSectorState(s)), sel: new Set(filtered.map(e=>String(e._id))) } }));
                              }}>Seleccionar visibles</Button>
                              <Button variant="outline" onClick={() => setSectorState(prev => ({ ...prev, [s._id]: inicialSectorState(s) }))}>Revertir</Button>
                            </div>

                            <div className="flex-1 max-h-[36vh] overflow-auto border rounded p-2">
                              <div className="grid grid-cols-1 gap-2">
                                {filtered.map((e) => {
                                  const id = String(e._id);
                                  const checked = (st.sel || new Set()).has(id);
                                  return (
                                    <label key={id} className={`flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer ${checked ? "bg-accent/50" : ""}`}>
                                      <input type="checkbox" checked={checked} onChange={() => toggleSectorRef(s._id, id)} />
                                      <div className="min-w-0">
                                        <div className="font-medium truncate">{e.apellido}, {e.nombre}</div>
                                        <div className="text-xs text-muted-foreground truncate">{e.puesto || "—"}</div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-2">
                              <Button variant="outline" onClick={() => setSectorState(prev => ({ ...prev, [s._id]: inicialSectorState(s) }))}>Revertir</Button>
                              <Button onClick={() => saveOneSector(s)}>Guardar referentes</Button>
                              <Button variant="destructive" onClick={async () => {
                                if (!confirm(`Eliminar sector ${s.nombre}?`)) return;
                                try {
                                  await api(`/sectores/${s._id}`, { method: "DELETE" });
                                  toast.success("Sector eliminado");
                                  onSectorDeleted?.(s._id);
                                  setSectores(prev => prev.filter(x => x._id !== s._id));
                                } catch (err) {
                                  console.error(err);
                                  toast.error(err?.data?.message || "No se pudo eliminar el sector");
                                }
                              }}>Eliminar sector</Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground mt-2">
                            Este sector está heredando los referentes del área. Desmarcá la opción para asignar referentes personalizados.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
