// src/pages/MiDesempeno.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { dashEmpleado } from "@/lib/dashboard";
import { api } from "@/lib/api";
import EvaluacionFlow from "@/components/EvaluacionFlow";
import HistorialEvaluacion from "@/components/HistorialEvaluacion";

const pick = (o, ...keys) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

const estadoChip = (estado) => {
  const map = {
    MANAGER_DRAFT: { text: "Borrador jefe", cls: "bg-amber-100 text-amber-700 ring-amber-200" },
    PENDING_EMPLOYEE: { text: "Pendiente empleado", cls: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
    PENDING_HR: { text: "Pendiente RRHH", cls: "bg-blue-100 text-blue-700 ring-blue-200" },
    CLOSED: { text: "Cerrada", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  };
  const m = map[estado] || { text: "Sin estado", cls: "bg-muted text-muted-foreground ring-border/50" };
  return (
    <span className={`inline-flex items-center px-2.5 h-6 text-[11px] rounded-full ring-1 ${m.cls}`}>
      {m.text}
    </span>
  );
};

export default function MiDesempeno() {
  const { user } = useAuth();
const [anio, setAnio] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("todos");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [periodoSel, setPeriodoSel] = useState(null);

  const [evalsEmpleado, setEvalsEmpleado] = useState([]);
  const [evalActual, setEvalActual] = useState(null); // 👉 nuevo estado

  const empleadoIdFromUser = (u) =>
    u?.empleadoId?._id || u?.empleadoId || u?._id || u?.id || null;

  const fetchDash = useCallback(async () => {
    const empleadoId = empleadoIdFromUser(user);
    if (!empleadoId) {
      toast.error("Falta referencia a la ficha del empleado en tu usuario.");
      setError("Falta empleado en user");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await dashEmpleado(empleadoId); // ⚡ ya no filtramos por año
      if (!res) {
        setError("Empleado no encontrado en el servidor.");
        setData(null);
        toast.error("Empleado no encontrado.");
        return;
      }
      const normalized = { ...res };
      if (normalized.objetivos && !Array.isArray(normalized.objetivos) && normalized.objetivos.items) {
        normalized.objetivos = normalized.objetivos.items;
      }
      if (normalized.aptitudes && !Array.isArray(normalized.aptitudes) && normalized.aptitudes.items) {
        normalized.aptitudes = normalized.aptitudes.items;
      }
      setData(normalized);
    } catch (err) {
      console.error("dashEmpleado error", err);
      setError(err?.message || "Error al cargar dashboard");
      toast.error("No pude cargar tu desempeño (ver consola).");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, anio]);

  useEffect(() => { fetchDash(); }, [fetchDash]);
// 1) Cargar TODAS las evaluaciones del empleado
useEffect(() => {
  const loadEvals = async () => {
    const empleadoId = empleadoIdFromUser(user);
    if (!empleadoId) return;
    try {
      const url = `/evaluaciones?empleado=${empleadoId}`;
      console.log("🌐 Fetching:", url);
      const ev = await api(url);
      console.log("📥 Response cruda de API:", ev);

      let arr = [];
      if (Array.isArray(ev)) {
        arr = ev;
      } else if (ev?.items && Array.isArray(ev.items)) {
        arr = ev.items;
      }

      setEvalsEmpleado(arr);
      console.log("✅ setEvalsEmpleado con", arr.length, "items");
    } catch (e) {
      console.error("Error cargando evalsEmpleado", e);
    }
  };

  loadEvals();
}, [user]);

// 2) Cuando hay evals + selected + periodo, buscar el match y cargar detalle
useEffect(() => {
  const loadEvalDetalle = async () => {
    if (!selected || !periodoSel) {
      setEvalActual(null);
      return;
    }

    console.log("🟢 DEBUG inicio loadEvalDetalle", {
      selectedId: selected?._id,
      periodoSel,
      empleadoId: empleadoIdFromUser(user),
      evalsEmpleadoCount: evalsEmpleado.length,
    });

    evalsEmpleado.forEach((ev, i) => {
      console.log(`   🔎 Eval[${i}]`, {
        _id: ev._id,
        empleado: ev.empleado,
        plantillaId: String(ev.plantillaId?._id || ev.plantillaId),
        periodo: ev.periodo,
      });
    });

    const base = evalsEmpleado.find((ev) => {
      const plantillaId = String(ev.plantillaId?._id || ev.plantillaId);
      const periodo = String(ev.periodo).trim();

      const plantillaMatch = plantillaId === String(selected._id);
      const periodoMatch = periodo === String(periodoSel).trim();

      console.log("   ↪ Comparando:", {
        evId: ev._id,
        plantillaId,
        periodo,
        plantillaMatch,
        periodoMatch,
      });

      return plantillaMatch && periodoMatch;
    });

    console.log("🔍 MATCH encontrado:", base);

    if (base?._id) {
      try {
        const detalle = await api(`/evaluaciones/detalle/${base._id}`);
        console.log("📥 DETALLE API", detalle);
        setEvalActual(detalle);
      } catch (e) {
        console.error("❌ Error cargando detalle eval", e);
        setEvalActual(base);
      }
    } else {
      console.warn("⚠ No se encontró evaluación", {
        selected,
        periodoSel,
        evalsEmpleado,
      });
      setEvalActual(null);
    }
  };

  loadEvalDetalle();
}, [evalsEmpleado, selected?._id, periodoSel]);




  const sidebarItems = useMemo(() => {
    let items = [];
    if (!data) return items;
    if (tab === "todos" || tab === "objetivo") {
      items = items.concat((data.objetivos || []).map((o) => ({ ...o, _tipo: "objetivo" })));
    }
    if (tab === "todos" || tab === "aptitud") {
      items = items.concat((data.aptitudes || []).map((a) => ({ ...a, _tipo: "aptitud" })));
    }
    const t = q.trim().toLowerCase();
    if (t) {
      items = items.filter((i) =>
        (i.nombre || "").toLowerCase().includes(t) ||
        (i.descripcion || "").toLowerCase().includes(t)
      );
    }
    items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    return items;
  }, [data, tab, q]);

  useEffect(() => {
    if (sidebarItems.length && !selected) {
      setSelected(sidebarItems[0]);
    } else if (selected && !sidebarItems.find((i) => String(i._id) === String(selected._id))) {
      setSelected(sidebarItems[0] || null);
    }
  }, [sidebarItems, selected]);

  useEffect(() => {
    if (selected?.hitos?.length) {
      setPeriodoSel(selected.hitos[0].periodo);
    } else {
      setPeriodoSel(null);
    }
  }, [selected?._id]);

  const detalleHito = useMemo(() => {
    if (!selected || !periodoSel) return null;
    const h = (selected.hitos || []).find((x) => x.periodo === periodoSel) || null;
    const progreso = Number(evalActual?.actual ?? h?.actual ?? selected?.progreso ?? 0);
    return {
      progreso,
      fecha: h?.fecha || selected?.fechaLimite || null,
    };
  }, [selected, periodoSel, evalActual]);

  if (!user) {
    return (
      <div className="container-app">
        <div className="max-w-5xl mx-auto rounded-xl bg-card ring-1 ring-border/60 p-6 text-center text-sm text-muted-foreground">
          Iniciá sesión para ver tu desempeño.
        </div>
      </div>
    );
  }


   return (
    <div className="container-app">
      <div className="mx-auto max-w-[1200px] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Mi desempeño </h1>
            <p className="text-sm text-muted-foreground">
              Consultá tu avance de objetivos y aptitudes, y firmá tus evaluaciones por período.
            </p>
          </div>

       
        </div>

        {/* Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6">

          {/* Sidebar */}
          <aside className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
            <div className="p-3 border-b border-border/60">
              {/* Tabs */}
              <div className="inline-flex rounded-lg bg-muted p-1">
                {[
                  { k: "todos", lbl: "Todos" },
                  { k: "objetivo", lbl: "🎯 Objetivos" },
                  { k: "aptitud", lbl: "💡 Aptitudes" },
                ].map((b) => (
                  <button
                    key={b.k}
                    className={`px-3 py-1.5 text-xs rounded-md ${
                      tab === b.k
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setTab(b.k)}
                  >
                    {b.lbl}
                  </button>
                ))}
              </div>

              {/* Buscador */}
              <div className="mt-3">
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Buscar por título o descripción…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {/* Listado */}
            <div className="max-h-[70vh] overflow-auto">
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
              ) : sidebarItems.length ? (
                <ul className="divide-y divide-border/60">
                  {sidebarItems.map((it) => {
                    const sel = selected && String(selected._id) === String(it._id);
                    const score =
                      it._tipo === "objetivo"
                        ? Number(it.progreso ?? 0)
                        : Number(it.puntuacion ?? it.score ?? 0);

                    return (
                      <li key={it._id}>
                        <button
                          className={`w-full text-left px-3 py-2 transition ${
                            sel ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                          }`}
                          onClick={() => setSelected(it)}
                        >
                          <div className="text-[11px] text-muted-foreground mb-0.5">
                            {it._tipo === "objetivo" ? "🎯 Objetivo" : "💡 Aptitud"}
                          </div>
                          <div className="font-medium leading-snug">{it.nombre}</div>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate pr-2">
                              {it.descripcion || "—"}
                            </span>
                            <span className="ml-2 shrink-0">{Math.round(score)}%</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">Sin resultados.</div>
              )}
            </div>
          </aside>

         {/* Hoja detalle */}
          <section className="rounded-xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
            {selected ? (
              <>
                {/* Encabezado hoja */}
                <div className="p-4 border-b border-border/60 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Detalle</div>
                    <h2 className="text-lg font-semibold leading-tight">
                      {selected?.nombre}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected?.descripcion || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Estado</div>
                    <div className="mt-1">{estadoChip(evalActual?.estado)}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Vencimiento:{" "}
                      <b className="text-foreground">
                        {detalleHito?.fecha ? String(detalleHito.fecha).slice(0, 10) : "—"}
                      </b>
                    </div>
                  </div>
                </div>

                {/* Datos clave + periodo */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 border-b border-border/60">
                  <div className="rounded-md bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Tipo</div>
                    <div className="font-medium">{selected._tipo === "objetivo" ? "Objetivo" : "Aptitud"}</div>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Peso base</div>
                    <div className="font-medium">{selected.peso ?? selected.pesoBase ?? "—"}%</div>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Método</div>
                    <div className="font-medium">{selected.metodo || "—"}</div>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Meta</div>
                    <div className="font-medium">
                      {selected.target != null ? `${selected.target} ${selected.unidad || ""}` : "—"}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Progreso</div>
                    <div className="font-medium">
                      {selected._tipo === "objetivo"
                        ? `${Math.round(detalleHito?.progreso ?? 0)}%`
                        : `${Math.round(detalleHito?.progreso ?? selected.puntuacion ?? 0)}%`}
                    </div>
                  </div>
                  <div className="md:col-span-2 rounded-md bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Periodo</div>
                    <select
                      className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                      value={periodoSel || ""}
                      onChange={(e) => setPeriodoSel(e.target.value || null)}
                    >
                      {(selected?.hitos || []).map((h) => (
                        <option key={h.periodo} value={h.periodo}>
                          {h.periodo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

               {/* Metas */}
                <div className="p-4 border-b border-border/60">
                  <h3 className="text-sm font-semibold mb-2">🧭 Metas del período</h3>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-[11px] uppercase text-muted-foreground tracking-wide">
                          <th className="text-left px-3 py-2">Meta</th>
                          <th className="text-left px-3 py-2">Esperado</th>
                          <th className="text-left px-3 py-2">Resultado</th>
                          <th className="text-left px-3 py-2">Cumple</th>
                        </tr>
                      </thead>
                      <tbody>
                       {(() => {
  console.log("🔍 evalsEmpleado RAW:", evalsEmpleado);
  console.log("🔍 selected._id:", selected?._id, "periodoSel:", periodoSel);
  console.log("🔍 evalActual:", evalActual);
  console.log("empleadoIdFromUser(user) =>", empleadoIdFromUser(user));

const metas =
  (evalActual?.metasResultados?.length
    ? evalActual.metasResultados
    : (selected.hitos || []).find((h) => h.periodo === periodoSel)?.metas) || [];

console.log("🧭 metasResultados en evalActual:", evalActual?.metasResultados);

  if (!metas.length) {
    return (
      <tr>
        <td className="px-3 py-3 text-muted-foreground text-center" colSpan={4}>
          No hay metas definidas para este período.
        </td>
      </tr>
    );
  }

  return metas.map((m, idx) => (
    <tr key={idx} className="border-t border-border/50 odd:bg-background even:bg-muted/20">
      <td className="px-3 py-2">{m.nombre || "Meta"}</td>
      <td className="px-3 py-2">
        {m.esperado ?? m.target ?? "—"} {m.unidad || ""}
      </td>
      <td className="px-3 py-2">{m.resultado ?? "—"}</td>
      <td className="px-3 py-2">
        {m.cumple === true ? (
          <span className="text-emerald-700 text-xs">✔ Cumple</span>
        ) : m.cumple === false ? (
          <span className="text-rose-600 text-xs">✘ No cumple</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
    </tr>
  ));
})()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flujo */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-2">📑 Flujo de evaluación</h3>
                  <EvaluacionFlow
                    empleadoId={empleadoIdFromUser(user)}
                    plantilla={selected}
                    
                  defaultPeriodo={periodoSel || selected.hitos?.[0]?.periodo}
                    user={user}
                    onChanged={async () => {
                      try {
                      const ev = await api(`/evaluaciones?empleado=${empleadoId}`);
console.log("📥 Response cruda de API:", ev, "esArray?", Array.isArray(ev));
if (Array.isArray(ev)) {
  setEvalsEmpleado(ev);
  console.log("✅ setEvalsEmpleado con", ev.length, "items");
} else if (ev?.items && Array.isArray(ev.items)) {
  setEvalsEmpleado(ev.items);
  console.log("✅ setEvalsEmpleado con", ev.items.length, "items (de items)");
} else {
  setEvalsEmpleado([]);
  console.warn("⚠ Response no era array:", ev);
}
                      } catch {}
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                Elegí un objetivo o aptitud en la izquierda para ver el detalle.
              </div>
            )}
          </section>

          {/* Historial real */}
          <aside className="hidden lg:block">
            <HistorialEvaluacion trazabilidad={evalActual?.timeline || []} />
          </aside>
        </div>
      </div>
    </div>
  );
}