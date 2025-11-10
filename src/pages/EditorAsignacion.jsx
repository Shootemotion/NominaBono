import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/* Helpers */
const asArray = (x) => {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.results)) return x.results;
  if (Array.isArray(x?.rows)) return x.rows;
  return [];
};

export default function EditorAsignacion() {
  const currentYear = new Date().getFullYear();

  /* Estado base */
  const [year, setYear] = useState(currentYear);
  const [areas, setAreas] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [participaciones, setParticipaciones] = useState([]);
  const [overrides, setOverrides] = useState([]);

  /* UI */
  const [mode, setMode] = useState("scope"); // 'scope' | 'employee'

  /* Índice empleados */
  const empleadosIndex = useMemo(
    () => Object.fromEntries(empleados.map((e) => [String(e._id), e])),
    [empleados]
  );

  /* --------------------- MODO ALCANCE --------------------- */
  const [scopeType, setScopeType] = useState("area"); // 'area' | 'sector'
  const [scopeId, setScopeId] = useState("");
  const [plantillas, setPlantillas] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);

  // Borrador por empleado (solo para el item seleccionado)
  // { empleadoId: { excluido?:bool, peso?:number|null, meta?:number|null } }
  const [draftScope, setDraftScope] = useState({});

  // Panel central: selección de empleados alcanzados (solo check visual)
  const [searchSel, setSearchSel] = useState("");
  const [middleSel, setMiddleSel] = useState({}); // { empleadoId: true/false }

  // Empleados alcanzados por el alcance (sin usar “share” para cálculo de UI)
  const empleadosEnScope = useMemo(() => {
    if (!scopeId) return [];
    if (scopeType === "sector") {
      return empleados
        .filter((e) => String(e?.sector?._id || e?.sector) === String(scopeId))
        .map((e) => ({ empleadoId: String(e._id) }));
    }
    // área
    return empleados
      .filter((e) => String(e?.area?._id || e?.area) === String(scopeId))
      .map((e) => ({ empleadoId: String(e._id) }));
  }, [empleados, scopeId, scopeType]);

  // Filas panel derecho (aplica overrides guardados + borradores locales)
  const rowsScope = useMemo(() => {
    if (!selectedTpl) return [];

    return empleadosEnScope
      .map(({ empleadoId }) => {
        const ov = overrides.find(
          (o) =>
            String(o.template) === String(selectedTpl._id) &&
            String(o.empleado) === String(empleadoId) &&
            Number(o.year) === Number(year)
        );

        const d = draftScope[empleadoId] || {};
        const excluido = d.excluido ?? ov?.excluido ?? false;
        const peso = d.peso !== undefined ? d.peso : ov?.peso ?? null;
        const meta = d.meta !== undefined ? d.meta : ov?.meta ?? null;

        const base = Number(selectedTpl.pesoBase ?? 0);
        const finalPeso = excluido ? 0 : Number((peso ?? base).toFixed(2));
        const isOverridden = !excluido && peso != null && Number(peso) !== base;

        return {
          empleadoId,
          nombre: `${empleadosIndex[empleadoId]?.apellido || ""}, ${
            empleadosIndex[empleadoId]?.nombre || ""
          }`,
          base,
          excluido,
          peso,
          meta,
          finalPeso,
          isOverridden,
          overrideId: ov?._id || null,
        };
      })
      // sólo los tildados en el panel del medio
      .filter((r) => !!middleSel[r.empleadoId])
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [selectedTpl, empleadosEnScope, overrides, draftScope, empleadosIndex, middleSel, year]);

  const hasChangesScope = useMemo(
    () => Object.keys(draftScope).length > 0,
    [draftScope]
  );

  const setRowDraftScope = (empleadoId, patch) => {
    setDraftScope((prev) => ({
      ...prev,
      [empleadoId]: { ...(prev[empleadoId] || {}), ...patch },
    }));
  };

  const resetChangesScope = () => setDraftScope({});

  const saveChangesScope = async () => {
    if (!selectedTpl) return;
    const tplId = selectedTpl._id;

    try {
      const ops = [];
      for (const empleadoId of Object.keys(draftScope)) {
        const { excluido, peso, meta } = draftScope[empleadoId];

        const existing = overrides.find(
          (ov) =>
            String(ov.template) === String(tplId) &&
            String(ov.empleado) === String(empleadoId) &&
            Number(ov.year) === Number(year)
        );

        const noOverride =
          !excluido &&
          (peso === null || peso === undefined) &&
          (meta === null || meta === undefined);

        if (noOverride) {
          if (existing?._id) {
            ops.push(api(`/overrides/${existing._id}`, { method: "DELETE" }));
          }
          continue;
        }

        ops.push(
          api(`/overrides`, {
            method: "POST",
            body: {
              empleado: String(empleadoId),
              year: Number(year),
              template: String(tplId),
              excluido: !!excluido,
              peso:
                peso === "" || peso === null || peso === undefined
                  ? null
                  : Number(peso),
              meta:
                meta === "" || meta === null || meta === undefined
                  ? null
                  : Number(meta),
            },
          })
        );
      }

      await Promise.all(ops);
      toast.success("Cambios guardados");
      const ov = await api(`/overrides?year=${Number(year)}`);
      setOverrides(asArray(ov));
      setDraftScope({});
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron guardar los cambios");
    }
  };

  // Sincronizar selección del medio cuando cambia plantilla/alcance
  useEffect(() => {
    if (!selectedTpl) {
      setMiddleSel({});
      return;
    }
    const init = {};
    empleadosEnScope.forEach(({ empleadoId }) => {
      init[empleadoId] = true; // por defecto, incluidos (se ve la tabla)
    });
    setMiddleSel(init);
    setSearchSel("");
  }, [selectedTpl, empleadosEnScope]);

  // Lista visible panel medio (con búsqueda)
  const empleadosLista = useMemo(() => {
    const q = searchSel.trim().toLowerCase();
    return empleadosEnScope
      .map(({ empleadoId }) => ({
        empleadoId,
        nombre: `${empleadosIndex[empleadoId]?.apellido || ""}, ${
          empleadosIndex[empleadoId]?.nombre || ""
        }`.trim(),
      }))
      .filter((r) => !q || r.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [empleadosEnScope, empleadosIndex, searchSel]);

  const setAllMiddle = (val) =>
    setMiddleSel(
      Object.fromEntries(empleadosEnScope.map(({ empleadoId }) => [empleadoId, !!val]))
    );

  /* --------------------- MODO EMPLEADO --------------------- */
  const [empleadoId, setEmpleadoId] = useState("");
  const [empleadoTemplates, setEmpleadoTemplates] = useState([]);
  const [draftEmp, setDraftEmp] = useState({}); // { tplId: { excluido?, peso?, meta? } }
  const hasChangesEmp = useMemo(
    () => Object.keys(draftEmp).length > 0,
    [draftEmp]
  );

  const setTplDraft = (tplId, patch) => {
    setDraftEmp((prev) => ({ ...prev, [tplId]: { ...(prev[tplId] || {}), ...patch } }));
  };
  const resetChangesEmp = () => setDraftEmp({});

  const saveChangesEmp = async () => {
    if (!empleadoId) return;
    try {
      const ops = [];
      for (const tplId of Object.keys(draftEmp)) {
        const { excluido, peso, meta } = draftEmp[tplId];

        const existing = overrides.find(
          (ov) =>
            String(ov.template) === String(tplId) &&
            String(ov.empleado) === String(empleadoId) &&
            Number(ov.year) === Number(year)
        );

        const noOverride =
          !excluido &&
          (peso === null || peso === undefined) &&
          (meta === null || meta === undefined);

        if (noOverride) {
          if (existing?._id) {
            ops.push(api(`/overrides/${existing._id}`, { method: "DELETE" }));
          }
          continue;
        }

        ops.push(
          api(`/overrides`, {
            method: "POST",
            body: {
              empleado: String(empleadoId),
              year: Number(year),
              template: String(tplId),
              excluido: !!excluido,
              peso:
                peso === "" || peso === null || peso === undefined
                  ? null
                  : Number(peso),
              meta:
                meta === "" || meta === null || meta === undefined
                  ? null
                  : Number(meta),
            },
          })
        );
      }

      await Promise.all(ops);
      toast.success("Cambios guardados");
      const ov = await api(`/overrides?year=${Number(year)}`);
      setOverrides(asArray(ov));
      setDraftEmp({});
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron guardar los cambios");
    }
  };

  /* --------------------- CARGAS --------------------- */
  useEffect(() => {
    (async () => {
      try {
        const [a, s, e] = await Promise.all([api("/areas"), api("/sectores"), api("/empleados")]);
        setAreas(asArray(a));
        setSectores(asArray(s));
        setEmpleados(asArray(e));
      } catch (err) {
        console.error(err);
        toast.error("No se pudieron cargar datos base");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, ov] = await Promise.all([
          api(`/participaciones?year=${Number(year)}`),
          api(`/overrides?year=${Number(year)}`),
        ]);
        setParticipaciones(asArray(p));
        setOverrides(asArray(ov));
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar participaciones/overrides");
      }
    })();
  }, [year]);

  // Plantillas por alcance
  useEffect(() => {
    (async () => {
      if (mode !== "scope") return;
      if (!scopeId) {
        setPlantillas([]);
        setSelectedTpl(null);
        return;
      }
      try {
        const params = new URLSearchParams({
          year: String(year),
          scopeType,
          scopeId,
        });
        const data = await api(`/templates?${params.toString()}`);
        setPlantillas(asArray(data));
        setSelectedTpl(null);
        setDraftScope({});
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar plantillas");
      }
    })();
  }, [mode, year, scopeType, scopeId]);

  // Plantillas que aplican al empleado (empleado + sus ámbitos)
  useEffect(() => {
    (async () => {
      if (mode !== "employee") return;
      if (!empleadoId) {
        setEmpleadoTemplates([]);
        setDraftEmp({});
        return;
      }
      try {
        const employeeTpls = asArray(
          await api(
            `/templates?${new URLSearchParams({
              year: String(year),
              scopeType: "empleado",
              scopeId: String(empleadoId),
            }).toString()}`
          )
        );

        const all = [];

        // Empleado directo
        employeeTpls.forEach((tpl) => {
          const ov = overrides.find(
            (o) =>
              String(o.template) === String(tpl._id) &&
              String(o.empleado) === String(empleadoId) &&
              Number(o.year) === Number(year)
          );
          all.push({
            tpl,
            scopeType: "empleado",
            scopeId: String(empleadoId),
            base: Number(tpl.pesoBase ?? 0),
            excluido: ov?.excluido ?? false,
            peso: ov?.peso ?? null,
            meta: ov?.meta ?? null,
            overrideId: ov?._id || null,
          });
        });

        all.sort(
          (a, b) =>
            (a.tpl.tipo || "").localeCompare(b.tpl.tipo || "") ||
            (a.tpl.nombre || "").localeCompare(b.tpl.nombre || "")
        );

        setEmpleadoTemplates(all);
        setDraftEmp({});
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar plantillas del empleado");
      }
    })();
  }, [mode, empleadoId, year, overrides]);

  /* --------------------- RENDER --------------------- */

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 space-y-6">
      {/* Header y modo */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Editor de Asignación</h1>
          <p className="text-sm text-muted-foreground">
            Excluí o ajustá pesos y metas del objetivo/aptitud seleccionado. Cambios por año.
          </p>
        </div>

        <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 p-1 flex gap-1">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${
              mode === "scope" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => {
              setMode("scope");
              setEmpleadoId("");
              setEmpleadoTemplates([]);
              setDraftEmp({});
            }}
          >
            Por alcance
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${
              mode === "employee" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => {
              setMode("employee");
              setPlantillas([]);
              setSelectedTpl(null);
              setDraftScope({});
            }}
          >
            Por empleado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 p-4">
        <div className="grid grid-cols-1 md:grid-cols-[140px_200px_1fr] items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Año</label>
            <input
              type="number"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value || currentYear))}
            />
          </div>

          {mode === "scope" ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Alcance</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={scopeType}
                  onChange={(e) => {
                    setScopeType(e.target.value);
                    setScopeId("");
                    setSelectedTpl(null);
                  }}
                >
                  <option value="area">Área</option>
                  <option value="sector">Sector</option>
                </select>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">
                    {scopeType === "sector" ? "Sector" : "Área"}
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                  >
                    <option value="">Seleccioná…</option>
                    {scopeType === "sector"
                      ? sectores.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.nombre}
                          </option>
                        ))
                      : areas.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.nombre}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="hidden md:flex flex-col min-w-[240px]">
                  <label className="text-xs text-muted-foreground">Buscar empleado</label>
                  <input
                    value={searchSel}
                    onChange={(e) => setSearchSel(e.target.value)}
                    placeholder="Apellido, nombre o apodo…"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Empleado</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                >
                  <option value="">Seleccioná…</option>
                  {empleados
                    .slice()
                    .sort((a, b) =>
                      `${a.apellido}, ${a.nombre}`.localeCompare(`${b.apellido}, ${b.nombre}`)
                    )
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.apellido}, {e.nombre} {e.apodo ? `(${e.apodo})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {mode === "scope" ? (
        /* LAYOUT: 280px | 360px | flexible (doble ancho) */
       <div className="grid grid-cols-1 xl:grid-cols-[260px_320px_minmax(0,2.25fr)] gap-6">

          {/* Izquierda: plantillas */}
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 p-3 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Plantillas del alcance</h3>
              <span className="text-xs text-muted-foreground">{plantillas.length} ítems</span>
            </div>
            <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {plantillas.map((p) => (
                <li key={p._id}>
                  <button
                    className={`w-full text-left rounded-md px-3 py-2 border transition-colors ${
                      selectedTpl?._id === p._id
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted/60"
                    }`}
                    onClick={() => {
                      setSelectedTpl(p);
                      setDraftScope({});
                    }}
                  >
                    <div className="font-medium">{p.nombre}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-background/60 ring-1 ring-border/60">
                        {p.tipo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-background/60 ring-1 ring-border/60">
                        Peso base {p.pesoBase ?? 0}%
                      </span>
                      {p.metodo && (
                        <span className="px-2 py-0.5 rounded-full bg-background/60 ring-1 ring-border/60">
                          {p.metodo}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
              {!plantillas.length && (
                <li className="text-sm text-muted-foreground px-1">No hay plantillas.</li>
              )}
            </ul>
          </div>

          {/* Medio: selección empleados */}
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 p-3 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                {selectedTpl ? "Empleados alcanzados" : "Seleccioná una plantilla"}
              </h3>
              {selectedTpl && (
                <div className="flex items-center gap-2 text-xs">
                  <button className="underline" onClick={() => setAllMiddle(true)}>Incluir todos</button>
                  <span className="text-muted-foreground">·</span>
                  <button className="underline" onClick={() => setAllMiddle(false)}>Excluir todos</button>
                </div>
              )}
            </div>

            {selectedTpl ? (
              <>
                <div className="h-[520px] overflow-auto rounded-md border border-border/60 bg-background">
                  {empleadosLista.map((r) => (
                    <label
                      key={r.empleadoId}
                      className="flex items-center gap-2 px-3 py-2 border-b border-border/40 text-sm hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={!!middleSel[r.empleadoId]}
                        onChange={(e) =>
                          setMiddleSel((prev) => ({ ...prev, [r.empleadoId]: e.target.checked }))
                        }
                      />
                      <span className="flex-1 truncate">{r.nombre}</span>
                    </label>
                  ))}
                  {!empleadosLista.length && (
                    <div className="p-3 text-sm text-muted-foreground">No hay empleados.</div>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tip: lo que tildás acá aparece en la tabla de la derecha. El “Excluir” de la derecha
                  quita **al empleado del objetivo/aptitud seleccionado** (se guarda en overrides).
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Elegí una plantilla del listado izquierdo.</div>
            )}
          </div>

          {/* Derecha: overrides */}
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden min-w-0">
            <div className="p-3 border-b bg-muted/20">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                {selectedTpl ? `Empleados – ${selectedTpl.nombre}` : "Seleccioná una plantilla"}
              </h3>
            </div>

            <div className="p-0">
              {selectedTpl ? (
                <table className="w-full text-sm table-auto">
                  <thead className="sticky top-0 bg-card z-10 shadow-sm">
                    <tr className="text-[11px] uppercase text-muted-foreground tracking-wide">
                      <th className="text-left px-3 py-2">Empleado</th>
                      <th className="text-center px-3 py-2">Base</th>
                      <th className="text-center px-3 py-2">Override</th>
                      <th className="text-center px-3 py-2">Final</th>
                      <th className="text-center px-3 py-2">Meta base</th>
                      <th className="text-center px-3 py-2">Meta override</th>
                      <th className="text-center px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsScope.map((r) => (
                      <tr
                        key={r.empleadoId}
                        className="border-t border-border/50 odd:bg-background even:bg-muted/40 hover:bg-accent/30 transition"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{r.nombre}</span>
                            {r.isOverridden && !r.excluido && (
                              <span className="text-[10px] rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 ring-1 ring-amber-200">
                                Override
                              </span>
                            )}
                            {r.excluido && (
                              <span className="text-[10px] rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 ring-1 ring-rose-200">
                                Excluido
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2 text-center">{r.base}%</td>

                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            className="w-16 text-right rounded-md border border-border bg-background px-2 py-1 placeholder:text-muted-foreground disabled:bg-muted/40 disabled:text-muted-foreground"
                            value={r.excluido ? "" : r.peso ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRowDraftScope(r.empleadoId, { peso: val === "" ? null : Number(val) });
                            }}
                            disabled={!!r.excluido}
                            placeholder={String(r.base)}
                            title="Dejar vacío para usar el peso base"
                          />
                        </td>

                       <td className="px-3 py-2 text-center font-medium">
  {r.finalPeso}%
</td>

                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {selectedTpl?.target ? `${selectedTpl.target} ${selectedTpl.unidad || ""}` : "—"}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-16 text-right rounded-md border border-border bg-background px-2 py-1 placeholder:text-muted-foreground disabled:bg-muted/40 disabled:text-muted-foreground"
                            value={r.excluido ? "" : r.meta ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRowDraftScope(r.empleadoId, { meta: val === "" ? null : Number(val) });
                            }}
                            disabled={!!r.excluido}
                            placeholder={selectedTpl?.target ? String(selectedTpl.target) : "—"}
                            title="Dejar vacío para usar la meta base"
                          />
                        </td>

                        <td className="px-3 py-2 text-center">
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={!!r.excluido}
                              onChange={(e) => {
                                const ex = e.target.checked;
                                setRowDraftScope(r.empleadoId, {
                                  excluido: ex,
                                  ...(ex ? { peso: null, meta: null } : {}),
                                });
                              }}
                            />
                            <span className="text-muted-foreground">Excluir</span>
                          </label>
                        </td>
                      </tr>
                    ))}

                    {!rowsScope.length && (
                      <tr>
                        <td className="px-3 py-4 text-muted-foreground text-center" colSpan={7}>
                          No hay empleados seleccionados en la columna del medio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">Elegí una plantilla del listado izquierdo.</div>
              )}
            </div>

            <div className="p-3 border-t bg-card flex justify-end gap-2">
              <Button variant="outline" onClick={resetChangesScope} disabled={!hasChangesScope}>
                Descartar cambios
              </Button>
              <Button onClick={saveChangesScope} disabled={!hasChangesScope || !selectedTpl}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* MODO EMPLEADO, layout simple y sin “share” */
        <div className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
          <div className="p-3 border-b bg-muted/20">
            <h3 className="text-sm font-semibold">
              {empleadoId
                ? `Plantillas del empleado · ${empleadosIndex[empleadoId]?.apellido || ""}, ${
                    empleadosIndex[empleadoId]?.nombre || ""
                  }`
                : "Seleccioná un empleado"}
            </h3>
          </div>

          <div className="p-0 overflow-x-auto">
            {empleadoId ? (
              <table className="w-full text-sm table-auto">
                <thead className="sticky top-0 bg-card z-10 shadow-sm">
                  <tr className="text-[11px] uppercase text-muted-foreground tracking-wide">
                    <th className="text-left px-3 py-2">Plantilla</th>
                    <th className="text-left px-3 py-2">Alcance</th>
                    <th className="text-left px-3 py-2">Base</th>
                    <th className="text-left px-3 py-2">Override</th>
                    <th className="text-left px-3 py-2">Final</th>
                    <th className="text-left px-3 py-2">Meta base</th>
                    <th className="text-left px-3 py-2">Meta override</th>
                    <th className="text-left px-3 py-2">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {empleadoTemplates.map((row) => {
                    const base = Number(row.base ?? 0);
                    const isOverridden = !row.excluido && row.peso != null && Number(row.peso) !== base;
                    const finalPeso = row.excluido ? 0 : Number((row.peso ?? base).toFixed(2));

                    return (
                      <tr
                        key={row.tpl._id}
                        className="border-t border-border/60 odd:bg-background even:bg-muted/20 hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium flex items-center gap-2">
                            <span>{row.tpl.nombre}</span>
                            {isOverridden && !row.excluido && (
                              <span className="text-[10px] rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 ring-1 ring-amber-200">
                                Override
                              </span>
                            )}
                            {row.excluido && (
                              <span className="text-[10px] rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 ring-1 ring-rose-200">
                                Excluido
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.tpl.tipo} · {row.tpl.metodo || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {row.scopeType === "sector" ? "Sector" : row.scopeType === "area" ? "Área" : "Empleado"}
                        </td>
                        <td className="px-3 py-2">{base}%</td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right placeholder:text-muted-foreground disabled:bg-muted/40 disabled:text-muted-foreground"
                            value={
                              (draftEmp[row.tpl._id]?.excluido ?? row.excluido)
                                ? ""
                                : draftEmp[row.tpl._id]?.peso ?? row.peso ?? ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setTplDraft(row.tpl._id, { peso: val === "" ? null : Number(val) });
                            }}
                            disabled={(draftEmp[row.tpl._id]?.excluido ?? row.excluido) || false}
                            placeholder={String(base)}
                            title="Dejar vacío para usar el peso base"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{finalPeso}%</td>

                        <td className="px-3 py-2">
                          {row.tpl?.target ? `${row.tpl.target} ${row.tpl.unidad || ""}` : "—"}
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right placeholder:text-muted-foreground disabled:bg-muted/40 disabled:text-muted-foreground"
                            value={
                              (draftEmp[row.tpl._id]?.excluido ?? row.excluido)
                                ? ""
                                : draftEmp[row.tpl._id]?.meta ?? row.meta ?? ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setTplDraft(row.tpl._id, { meta: val === "" ? null : Number(val) });
                            }}
                            disabled={(draftEmp[row.tpl._id]?.excluido ?? row.excluido) || false}
                            placeholder={row.tpl?.target ? String(row.tpl.target) : "—"}
                            title="Dejar vacío para usar la meta base"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={(draftEmp[row.tpl._id]?.excluido ?? row.excluido) || false}
                            onChange={(e) =>
                              setTplDraft(row.tpl._id, {
                                excluido: e.target.checked,
                                ...(e.target.checked ? { peso: null, meta: null } : {}),
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!empleadoTemplates.length && (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={8}>
                        No hay plantillas que apliquen a este empleado para el año seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">Elegí un empleado arriba.</div>
            )}
          </div>

          <div className="p-3 border-t bg-card flex justify-end gap-2">
            <Button variant="outline" onClick={resetChangesEmp} disabled={!hasChangesEmp}>
              Descartar cambios
            </Button>
            <Button onClick={saveChangesEmp} disabled={!hasChangesEmp || !empleadoId}>
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
