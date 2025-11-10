import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Users, Target, BadgeCheck, DollarSign, AlertCircle, Trophy, Building2,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { ejecutivoResumen, ejecutivoDepartamentos } from "@/lib/ejecutivo";

// helpers
const nf = new Intl.NumberFormat("es-AR");
const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

// UI auxiliares
function Progress({ value = 0, max = 1 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
      <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
    </div>
  );
}
function Delta({ delta }) {
  if (delta === undefined || delta === null) return null;
  const pos = delta >= 0;
  const text = pos
    ? `+${(Math.abs(delta) * 100).toFixed(1)}%`
    : `-${(Math.abs(delta) * 100).toFixed(1)}%`;
  return (
    <span className={`text-xs ml-2 ${pos ? "text-emerald-600" : "text-red-600"}`}>
      {text}
    </span>
  );
}

function KpiCard({ icon: Icon, title, value, sub, delta }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 grid place-items-center rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
        {delta !== undefined && <Delta delta={delta} />}
      </div>
      <div className="text-3xl font-extrabold leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
    </div>
  );
}

export default function SeguimientoEjecutivo() {
  // filtros
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [departamento, setDepartamento] = useState(""); // sectorId
  const [trimestre, setTrimestre] = useState("");

  // datos
  const [sectores, setSectores] = useState([]);
  const [rows, setRows] = useState([]);   // departamentos desde API
  const [kpis, setKpis] = useState(null); // resumen desde API
  const [loading, setLoading] = useState(false);

  // cargar sectores para el combo
  useEffect(() => {
    (async () => {
      try {
        const data = await api("/sectores");
        setSectores(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los sectores.");
      }
    })();
  }, []);

  // cargar KPIs + tabla cada vez que cambia año o depto
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [r1, r2] = await Promise.all([
          ejecutivoResumen(anio),
          ejecutivoDepartamentos(anio, departamento || undefined),
        ]);
        setKpis(r1 || null);
        setRows(Array.isArray(r2) ? r2 : []);
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar el seguimiento ejecutivo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [anio, departamento]);

  // fallback si no hay kpis aún
  const totals = kpis || {
    empleados: 0, departamentos: 0,
    objetivosProm: 0, objetivosDelta: 0,
    aptitudesProm: 0, aptitudesDelta: 0, bonos: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
        <div className="bg-[#075C66] text-white px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <LineChart className="h-7 w-7" />
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                  Seguimiento Ejecutivo
                </h1>
              </div>
              <p className="opacity-90 mt-2 text-sm md:text-base">
                Vista organizacional de rendimiento y métricas clave
              </p>
            </div>

            {/* filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full md:w-auto">
              <div className="bg-white/10 rounded-md px-3 py-2">
                <div className="text-xs opacity-80">Año</div>
                <input
                  type="number"
                  className="bg-transparent outline-none w-full"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value) || new Date().getFullYear())}
                />
              </div>

              <div className="bg-white/10 rounded-md px-3 py-2 sm:col-span-2">
                <div className="text-xs opacity-80">Departamento</div>
                <select
                  className="bg-transparent outline-none w-full"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                >
                  <option value="">Todos</option>
                  {sectores.map((s) => (
                    <option key={s._id} value={s._id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white/10 rounded-md px-3 py-2">
                <div className="text-xs opacity-80">Trimestre</div>
                <select
                  className="bg-transparent outline-none w-full"
                  value={trimestre}
                  onChange={(e) => setTrimestre(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={Users}
          title="Empleados Totales"
          value={nf.format(totals.empleados)}
          sub={`En ${totals.departamentos} departamentos`}
        />
        <KpiCard
          icon={Target}
          title="Objetivos Promedio"
          value={`${totals.objetivosProm.toFixed(1)}%`}
          delta={totals.objetivosDelta}
          sub={<div className="mt-2"><Progress value={totals.objetivosProm} max={100} /></div>}
        />
        <KpiCard
          icon={BadgeCheck}
          title="Aptitudes Promedio"
          value={`${totals.aptitudesProm.toFixed(1)}/5.0`}
          delta={totals.aptitudesDelta}
          sub={<div className="mt-2"><Progress value={totals.aptitudesProm} max={5} /></div>}
        />
        <KpiCard
          icon={DollarSign}
          title="Bonos Proyectados"
          value={money(totals.bonos)}
          sub="Monto total estimado"
        />
      </div>

      {/* Tabla por departamento */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex">
          <button className="px-4 py-2 text-sm font-medium border-b-2 border-teal-600">
            Por Departamento
          </button>
          <button className="px-4 py-2 text-sm font-medium text-muted-foreground" disabled>
            Distribución
          </button>
          <button className="px-4 py-2 text-sm font-medium text-muted-foreground" disabled>
            Alertas
          </button>
          <button className="px-4 py-2 text-sm font-medium text-muted-foreground" disabled>
            Tendencias
          </button>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold mb-3">Métricas por Departamento — {anio}</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">
                    <div className="inline-flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> <span>Departamento</span>
                    </div>
                  </th>
                  <th className="py-2 pr-4">Empleados</th>
                  <th className="py-2 pr-4">Supervisores</th>
                  <th className="py-2 pr-4">Objetivos</th>
                  <th className="py-2 pr-4">Aptitudes</th>
                  <th className="py-2 pr-4">Bono Proy.</th>
                  <th className="py-2 pr-4">Alertas</th>
                  <th className="py-2 pr-4">Top Performer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.sectorId} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{r.nombre}</td>
                    <td className="py-3 pr-4">{r.empleados}</td>
                    <td className="py-3 pr-4">{r.supervisores}</td>
                    <td className="py-3 pr-4">
                      <div className="min-w-[160px]">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{(r.objetivosAvg * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={r.objetivosAvg} max={1} />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="min-w-[140px]">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{(r.aptitudesAvg || 0).toFixed(1)}/5</span>
                        </div>
                        <Progress value={r.aptitudesAvg || 0} max={5} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-medium">{money(r.bono || 0)}</td>
                    <td className="py-3 pr-4">
                      {r.alerts > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-100 px-2 py-0.5">
                          <AlertCircle className="h-4 w-4" /> {r.alerts}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5">
                          ✓ OK
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <div>
                          <div className="font-medium">{r.topPerformer?.nombre || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.topPerformer?.score != null ? `${(r.topPerformer.score * 100).toFixed(1)}%` : "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {loading ? "Cargando…" : "No hay datos con los filtros actuales."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}