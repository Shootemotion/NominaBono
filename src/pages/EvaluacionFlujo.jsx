import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api, API_ORIGIN } from "@/lib/api";
import { evaluarCumple, calcularResultadoGlobal } from "@/lib/evaluarCumple";
import { dashEmpleado } from "@/lib/dashboard";
import {
  UserCircle2,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  Save,
  Send,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Calendar,
  FileEdit,
  Users,
  CheckCircle
} from "lucide-react";

/* ===================== Constantes y helpers ===================== */

const ESTADOS = [
  { code: "NO_ENVIADOS", label: "No enviados", color: "bg-slate-100 text-slate-700", ring: "ring-slate-300" },
  { code: "PENDING_EMPLOYEE", label: "Enviados", color: "bg-amber-100 text-amber-800", ring: "ring-amber-300" },
  { code: "PENDING_HR", label: "En RRHH", color: "bg-blue-100 text-blue-800", ring: "ring-blue-300" },
  { code: "CLOSED", label: "Cerrados", color: "bg-emerald-100 text-emerald-800", ring: "ring-emerald-300" },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-[width] duration-300"
      style={{ width: `${Math.max(0, Math.min(100, Math.round(value)))}%` }}
    />
  </div>
);

function buildResumenEmpleado(data) {
  if (!data) return null;
  let objetivos = Array.isArray(data.objetivos) ? data.objetivos : (data.objetivos?.items || []);
  let aptitudes = Array.isArray(data.aptitudes) ? data.aptitudes : (data.aptitudes?.items || []);

  const pesos = objetivos.map((o) => Number(o.peso ?? o.pesoBase ?? 0));
  const prog = objetivos.map((o) => Number(o.progreso ?? 0));
  const totalPeso = pesos.reduce((a, b) => a + b, 0) || 0;

  const scoreObj = totalPeso > 0
    ? pesos.reduce((acc, p, i) => acc + p * (prog[i] || 0), 0) / totalPeso
    : prog.length ? prog.reduce((a, b) => a + b, 0) / prog.length : 0;

  const punt = aptitudes.map((a) => Number(a.puntuacion ?? a.score ?? 0));
  const scoreApt = punt.length ? punt.reduce((a, b) => a + b, 0) / punt.length : 0;

  const global = (scoreObj + scoreApt) / 2;

  return {
    objetivos: { cantidad: objetivos.length, peso: totalPeso, score: scoreObj },
    aptitudes: { cantidad: aptitudes.length, score: scoreApt },
    global,
  };
}

function metaKey(m = {}) {
  return `${m.nombre ?? ""}__${m.unidad ?? ""}`;
}

function dedupeMetas(arr = []) {
  const seen = new Set();
  const out = [];
  for (const m of arr) {
    const key = metaKey(m);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

function deepCloneMetas(metas = []) {
  const cloned = metas.map((m) => {
    const esperado = m.esperado ?? m.target ?? m.meta ?? null;
    return {
      _id: m._id,
      metaId: m.metaId || m._id,
      nombre: m.nombre,
      esperado,
      unidad: m.unidad,
      operador: m.operador || ">=",
      modoAcumulacion: m.modoAcumulacion || (m.acumulativa ? "acumulativo" : "periodo"),
      acumulativa: m.acumulativa ?? m.modoAcumulacion === "acumulativo",
      resultado: m.resultado ?? null,
      cumple: m.resultado != null && m.cumple != null ? !!m.cumple : false,
      peso: m.peso ?? m.pesoBase ?? null,
      reconoceEsfuerzo: m.reconoceEsfuerzo,
      permiteOver: m.permiteOver,
      tolerancia: m.tolerancia,
      reglaCierre: m.reglaCierre
    };
  });
  return dedupeMetas(cloned);
}

function bucketConfig(bucket) {
  switch (bucket) {
    case "por_vencer": return { label: "Por vencer", chip: "🔥 Por vencer", badgeClass: "bg-amber-100 text-amber-800", canEdit: true };
    case "vencido": return { label: "Vencidos", chip: "⚠ Vencido", badgeClass: "bg-rose-100 text-rose-800", canEdit: true };
    case "PENDING_EMPLOYEE": return { label: "Enviado", chip: "📨 Enviado", badgeClass: "bg-cyan-100 text-cyan-800", canEdit: false };
    case "PENDING_HR": return { label: "En RRHH", chip: "🏢 En RRHH", badgeClass: "bg-blue-100 text-blue-800", canEdit: false };
    case "CLOSED": return { label: "Cerrado", chip: "✅ Cerrado", badgeClass: "bg-emerald-100 text-emerald-800", canEdit: false };
    default: return { label: "Futuro", chip: "⏳ Futuro", badgeClass: "bg-slate-100 text-slate-700", canEdit: false };
  }
}

function getHitoStatus(hito) {
  if (hito.actual !== null || hito.estado === "CERRADO") return "evaluado";
  if (!hito.fecha) return "futuro";

  const now = new Date();
  const hitoDate = new Date(hito.fecha);
  const diffTime = hitoDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "vencido";
  if (diffDays <= 15) return "por_vencer";
  return "futuro";
}

function getHitoColorClass(status) {
  switch (status) {
    case "evaluado": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "vencido": return "bg-rose-100 text-rose-800 border-rose-200";
    case "por_vencer": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

/* ===================== Componente principal ===================== */

function getAccumulatedValue(obj, metaId, currentPeriod, currentValue) {
  if (!obj || !Array.isArray(obj.hitos)) return currentValue || 0;

  const periodOrder = ["Q1", "Q2", "Q3", "FINAL"];
  const currentIdx = periodOrder.indexOf(currentPeriod);
  if (currentIdx === -1) return currentValue || 0;

  let total = 0;
  for (const h of obj.hitos) {
    const hIdx = periodOrder.indexOf(h.periodo);
    if (hIdx !== -1 && hIdx <= currentIdx) {
      const m = h.metas?.find(m => (m.metaId === metaId || m._id === metaId));
      if (h.periodo === currentPeriod) {
        total += Number(currentValue || 0);
      } else if (m) {
        total += Number(m.resultado || 0);
      }
    }
  }
  return total;
}

/* ===================== Componente Principal ===================== */
export default function EvaluacionFlujo() {
  const { plantillaId, periodo, empleadoId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Roles
  const esReferente = Boolean((Array.isArray(user?.referenteAreas) && user.referenteAreas.length > 0) || (Array.isArray(user?.referenteSectors) && user.referenteSectors.length > 0));
  const esDirector = user?.rol === "directivo" || user?.isRRHH === true;
  const esSuperAdmin = user?.rol === "superadmin";
  const esVisor = user?.rol === "visor";
  const puedeVer = esReferente || esDirector || esSuperAdmin || esVisor;

  const [anio] = useState(state?.anio ?? Number(String(periodo || new Date().getFullYear()).slice(0, 4)));
  const [selectedEmpleadoId] = useState(empleadoId || state?.empleado?._id || state?.empleadosDelItem?.[0]?._id || user?.empleado?._id || null);
  const [empleadoInfo, setEmpleadoInfo] = useState(state?.empleado || state?.empleadosDelItem?.[0] || user?.empleado || null);

  const [dashEmpleadoData, setDashEmpleadoData] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState(plantillaId === "feedback-global" ? "feedback" : "evaluacion"); // "evaluacion" | "feedback"

  // Estado local para items expandidos y sus datos de evaluación
  const [expandedItems, setExpandedItems] = useState({}); // { [itemId]: boolean }
  const [evaluacionData, setEvaluacionData] = useState({}); // { [itemId]: { localHito: ..., comentarioManager: ... } }
  const [savingItems, setSavingItems] = useState({}); // { [itemId]: boolean }

  // Estado para expandir detalles de feedback
  const [expandedFeedback, setExpandedFeedback] = useState({}); // { [periodo]: boolean }

  const toggleFeedbackDetail = (periodo) => {
    setExpandedFeedback(prev => ({ ...prev, [periodo]: !prev[periodo] }));
  };

  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);

  // Periodo Global de Evaluación (por defecto el de la URL)
  const [periodoGlobal, setPeriodoGlobal] = useState(periodo || null);

  // Cargar info empleado
  useEffect(() => {
    (async () => {
      if (!selectedEmpleadoId || empleadoInfo) return;
      try {
        const emp = await api(`/empleados/${selectedEmpleadoId}`);
        setEmpleadoInfo(emp);
      } catch (e) { console.error(e); }
    })();
  }, [selectedEmpleadoId, empleadoInfo]);

  // Cargar Dashboard
  useEffect(() => {
    (async () => {
      if (!selectedEmpleadoId) return;
      try {
        setLoadingDash(true);
        const res = await dashEmpleado(selectedEmpleadoId, anio);
        if (res) {
          const normalized = { ...res };
          if (normalized.objetivos?.items && !Array.isArray(normalized.objetivos)) normalized.objetivos = normalized.objetivos.items;
          if (normalized.aptitudes?.items && !Array.isArray(normalized.aptitudes)) normalized.aptitudes = normalized.aptitudes.items;
          setDashEmpleadoData(normalized);
        }
      } catch (e) {
        console.error("dashEmpleado error:", e);
      } finally {
        setLoadingDash(false);
      }
    })();
  }, [selectedEmpleadoId, anio]);

  // Cargar Feedbacks
  useEffect(() => {
    (async () => {
      if (!selectedEmpleadoId || activeTab !== "feedback") return;
      try {
        setLoadingFeedbacks(true);
        const res = await api(`/feedbacks/empleado/${selectedEmpleadoId}?year=${anio}`);
        setFeedbacks(res || []);
      } catch (e) {
        console.error("Error loading feedbacks", e);
      } finally {
        setLoadingFeedbacks(false);
      }
    })();
  }, [selectedEmpleadoId, anio, activeTab]);

  // Helper para cargar evaluación de un item específico
  const loadItemEvaluacion = async (item, p) => {
    if (!selectedEmpleadoId || !item || !p) return;
    try {
      // 1. Traer plantilla full para asegurar metas
      let plantillaFull = item;
      if (!item.metas || item.metas.length === 0) {
        try {
          plantillaFull = await api(`/templates/${item._id}`);
        } catch (e) { console.error("Error loading template full", e); }
      }

      // 2. Traer evaluación existente
      const resp = await api(`/evaluaciones?empleado=${selectedEmpleadoId}&plantillaId=${item._id}&periodo=${p}`);
      const arr = Array.isArray(resp) ? resp : resp?.items || [];
      const ev = arr[0] || null;

      // 3. Construir localHito
      let localHito;
      let comentarioManager = "";

      if (ev) {
        // Hydrate
        const baseMetas = plantillaFull.metas || [];
        const resultados = ev.metasResultados || [];

        // Merge metas
        const map = new Map();
        baseMetas.forEach(m => map.set(metaKey(m), { ...m }));
        resultados.forEach(r => {
          const key = metaKey(r);
          const base = map.get(key) || {};
          map.set(key, { ...base, ...r, esperado: r.esperado ?? base.esperado, modoAcumulacion: r.modoAcumulacion ?? base.modoAcumulacion });
        });
        const metas = deepCloneMetas(Array.from(map.values()));

        localHito = {
          periodo: p,
          fecha: ev.fecha,
          estado: ev.estado,
          metas,
          actual: ev.actual ?? (metas.length ? calcularResultadoGlobal(metas) : null),
          comentario: ev.comentario ?? "",
          escala: ev.escala ?? null
        };
        comentarioManager = ev.comentarioManager ?? "";
      } else {
        // Blank
        localHito = {
          periodo: p,
          fecha: null,
          estado: "MANAGER_DRAFT",
          metas: deepCloneMetas(plantillaFull.metas || []).map(m => ({ ...m, resultado: null, cumple: false })),
          actual: null,
          comentario: "",
          escala: null
        };
      }

      setEvaluacionData(prev => ({
        ...prev,
        [item._id]: { localHito, comentarioManager }
      }));

    } catch (e) {
      console.error("Error loading item evaluation", e);
      toast.error("Error al cargar datos del objetivo");
    }
  };

  const toggleExpand = (item) => {
    const isExpanded = !!expandedItems[item._id];
    setExpandedItems(prev => ({ ...prev, [item._id]: !isExpanded }));

    if (!isExpanded && !evaluacionData[item._id]) {
      const p = periodoGlobal || item.hitos?.[0]?.periodo;
      if (p) loadItemEvaluacion(item, p);
    }
  };

  const handleUpdateLocalHito = (itemId, updater) => {
    setEvaluacionData(prev => {
      const current = prev[itemId];
      if (!current) return prev;
      const newLocalHito = typeof updater === 'function' ? updater(current.localHito) : updater;

      // Recalcular actual si es objetivo
      let newActual = newLocalHito.actual;
      if (newLocalHito.metas && newLocalHito.metas.length > 0) {
        newActual = calcularResultadoGlobal(newLocalHito.metas);
      }

      return {
        ...prev,
        [itemId]: {
          ...current,
          localHito: { ...newLocalHito, actual: newActual }
        }
      };
    });
  };

  const handleSaveItem = async (item, action = "draft") => {
    const data = evaluacionData[item._id];
    if (!data || !data.localHito) return;

    const { localHito, comentarioManager } = data;
    const periodoEval = localHito.periodo;
    const isApt = item._tipo === "aptitud" || item.tipo === "aptitud";

    if (isApt) {
      const escala = Number(localHito.escala);
      if (!escala || escala < 1 || escala > 5) {
        toast.error("Seleccioná una escala (1-5)");
        return;
      }
    }

    try {
      setSavingItems(prev => ({ ...prev, [item._id]: true }));

      const actualToSend = isApt ? (Number(localHito.escala) * 20) : (Number(localHito.actual) || 0);

      const body = {
        empleado: selectedEmpleadoId,
        plantillaId: item._id,
        year: Number(String(periodoEval).slice(0, 4)),
        periodo: periodoEval,
        actual: actualToSend,
        comentario: localHito.comentario,
        comentarioManager: comentarioManager,
        ...(isApt ? { escala: Number(localHito.escala), metasResultados: [] } : { metasResultados: dedupeMetas(localHito.metas) }),
        estado: "MANAGER_DRAFT"
      };

      await api("/evaluaciones", { method: "POST", body });
      await api(`/evaluaciones/${selectedEmpleadoId}/${item._id}/${periodoEval}`, { method: "PUT", body });

      if (action === "toEmployee") {
        const evals = await api(`/evaluaciones?plantillaId=${item._id}&periodo=${periodoEval}&empleado=${selectedEmpleadoId}`);
        const target = Array.isArray(evals) ? evals[0] : evals?.items?.[0];
        if (target) {
          await api(`/evaluaciones/${target._id}/submit-to-employee`, { method: "POST" });
          toast.success("Enviado al colaborador");
        }
      } else {
        toast.success("Borrador guardado");
      }

      const res = await dashEmpleado(selectedEmpleadoId, anio);
      if (res) setDashEmpleadoData(res);

    } catch (e) {
      console.error(e);
      toast.error("Error al guardar");
    } finally {
      setSavingItems(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleRecalculate = async (item) => {
    if (!confirm("¿Recalcular todas las evaluaciones de este objetivo con las reglas actuales?")) return;
    try {
      setSavingItems(prev => ({ ...prev, [item._id]: true }));
      await api("/evaluaciones/recalculate", {
        method: "POST",
        body: {
          plantillaId: item._id,
          year: anio,
          empleadoId: selectedEmpleadoId
        }
      });
      toast.success("Reglas actualizadas y evaluaciones recalculadas");

      // Reload dashboard
      const res = await dashEmpleado(selectedEmpleadoId, anio);
      if (res) setDashEmpleadoData(res);

      // Reload current item if open
      if (evaluacionData[item._id]?.localHito) {
        loadItemEvaluacion(item, evaluacionData[item._id].localHito.periodo);
      }

    } catch (e) {
      console.error(e);
      toast.error("Error al recalcular");
    } finally {
      setSavingItems(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleSaveFeedback = async (periodo, comentario, estado) => {
    try {
      await api("/feedbacks", {
        method: "POST",
        body: {
          empleado: selectedEmpleadoId,
          year: anio,
          periodo,
          comentario,
          estado
        }
      });
      toast.success(`Feedback ${periodo} guardado`);
      // Recargar
      const res = await api(`/feedbacks/empleado/${selectedEmpleadoId}?year=${anio}`);
      setFeedbacks(res || []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error al guardar feedback");
    }
  };

  const handleFeedbackChange = (periodo, val) => {
    setFeedbacks(prev => {
      const idx = prev.findIndex(f => f.periodo === periodo);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], comentario: val };
        return copy;
      } else {
        return [...prev, { periodo, comentario: val, estado: "PENDIENTE" }];
      }
    });
  };

  const calculatePeriodScore = (periodoStr) => {
    if (!dashEmpleadoData) return 0;
    if (periodoStr === "FINAL") return buildResumenEmpleado(dashEmpleadoData)?.global || 0;
    return 0;
  };

  const resumenEmpleado = useMemo(() => buildResumenEmpleado(dashEmpleadoData), [dashEmpleadoData]);
  const empleadoNombreCompleto = empleadoInfo ? `${empleadoInfo.apellido} ${empleadoInfo.nombre}` : "Colaborador";

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* HEADER */}
      <div className="bg-slate-950 text-white sticky top-0 z-20 shadow-xl border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white hover:bg-white/10">
                ← Volver
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {empleadoNombreCompleto}
                  <Badge variant="outline" className="text-slate-400 border-slate-700 font-normal">
                    {anio}
                  </Badge>
                </h1>
                <p className="text-xs text-slate-400">Sala de Evaluación</p>
              </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab("evaluacion")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "evaluacion" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <BarChart3 className="w-4 h-4 inline-block mr-2" />
                Evaluación de Objetivos
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "feedback" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <MessageSquare className="w-4 h-4 inline-block mr-2" />
                Feedback Trimestral
              </button>
            </div>

            {/* Global Score */}
            {resumenEmpleado && (
              <div className="hidden xl:flex items-center gap-8 bg-white/5 p-2 px-6 rounded-lg border border-white/10">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Objetivos</div>
                  <div className="text-2xl font-bold text-blue-400">{Math.round(resumenEmpleado.objetivos.score)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Competencias</div>
                  <div className="text-2xl font-bold text-amber-400">{Math.round(resumenEmpleado.aptitudes.score)}%</div>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="text-center">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Global</div>
                  <div className="text-3xl font-black text-emerald-400">{Math.round(resumenEmpleado.global)}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">

        {/* TAB: EVALUACION */}
        {activeTab === "evaluacion" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-700 border-b pb-2">
                <Target className="w-5 h-5" /> Objetivos
              </h2>
              {dashEmpleadoData?.objetivos?.map((obj) => {
                const isExpanded = !!expandedItems[obj._id];
                const data = evaluacionData[obj._id];
                const localHito = data?.localHito;
                const bucketCfg = bucketConfig(obj.bucket || "futuro");

                return (
                  <Card key={obj._id} className={`border-l-4 ${bucketCfg.badgeClass.replace("bg-", "border-l-").split(" ")[0]} shadow-sm transition-all ${isExpanded ? 'ring-2 ring-blue-100' : ''}`}>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggleExpand(obj)}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${bucketCfg.badgeClass} border-transparent font-normal`}>
                              {bucketCfg.chip}
                            </Badge>
                            <span className="text-xs text-slate-400 font-medium">Peso: {obj.peso}%</span>
                          </div>
                          <CardTitle className="text-base font-bold text-slate-800 leading-tight">
                            {obj.nombre}
                          </CardTitle>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-700">{Math.round(obj.progreso)}%</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Progreso</div>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-6 px-6 bg-slate-50/30 border-t">
                        {/* Milestone Selector */}
                        {obj.hitos && obj.hitos.length > 0 && (
                          <div className="mb-6 mt-4">
                            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Cronograma de Hitos</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {obj.hitos.map((h) => {
                                const status = getHitoStatus(h);
                                const colorClass = getHitoColorClass(status);
                                const isSelected = localHito?.periodo === h.periodo;
                                const isSelectable = status === "vencido" || status === "por_vencer" || status === "evaluado";

                                return (
                                  <div
                                    key={h.periodo}
                                    onClick={() => isSelectable && loadItemEvaluacion(obj, h.periodo)}
                                    className={`flex flex-col items-center justify-center p-2 rounded border ${colorClass} transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-slate-400' : ''} ${isSelectable ? 'cursor-pointer hover:brightness-95' : 'opacity-60 cursor-not-allowed'}`}
                                  >
                                    <span className="text-[10px] font-bold uppercase">{h.periodo}</span>
                                    <span className="text-xs font-semibold">{h.actual !== null ? `${Math.round(h.actual)}%` : "-"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {localHito ? (
                          <div className="space-y-6 mt-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Evaluando Período:</span>
                                <Badge className="bg-slate-900 text-white hover:bg-slate-800">{localHito.periodo}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Score Hito:</span>
                                <span className="text-lg font-bold text-emerald-600">{Number(localHito.actual).toFixed(1)}%</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {localHito.metas.map((meta, idx) => {
                                const isAcumulativo = meta.modoAcumulacion === "acumulativo";
                                const valorEvaluado = isAcumulativo
                                  ? getAccumulatedValue(obj, meta.metaId || meta._id, localHito.periodo, meta.resultado)
                                  : meta.resultado;

                                const cumple = evaluarCumple(valorEvaluado, meta.esperado, meta.operador, meta.unidad);

                                return (
                                  <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-semibold text-sm text-slate-800">{meta.nombre}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                                          <span>Esperado: <b>{meta.operador} {meta.esperado} {meta.unidad}</b></span>
                                          {isAcumulativo && <span className="text-purple-600 bg-purple-50 px-1.5 rounded border border-purple-100">Acumulativo</span>}
                                          {meta.reglaCierre && <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded border border-indigo-100">Cierre: {meta.reglaCierre}</span>}
                                          {meta.reconoceEsfuerzo && <span className="text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100">Reconoce Esfuerzo</span>}
                                          {meta.permiteOver && <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">Permite Over</span>}
                                          {meta.tolerancia > 0 && <span className="text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">Tol: {meta.tolerancia}</span>}
                                        </div>
                                      </div>
                                      <div className="w-32">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Resultado</label>
                                        {meta.unidad === "Cumple/No Cumple" ? (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                              checked={!!meta.resultado}
                                              onChange={(e) => {
                                                const val = e.target.checked;
                                                handleUpdateLocalHito(obj._id, (prev) => {
                                                  const metas = [...prev.metas];
                                                  metas[idx] = { ...metas[idx], resultado: val, cumple: val };
                                                  return { ...prev, metas };
                                                });
                                              }}
                                            />
                                            <span className="text-sm">{meta.resultado ? "Cumple" : "No Cumple"}</span>
                                          </div>
                                        ) : (
                                          <Input
                                            type="number"
                                            className="h-8 text-sm font-medium"
                                            placeholder="Valor..."
                                            value={meta.resultado ?? ""}
                                            onChange={(e) => {
                                              const val = e.target.value === "" ? null : Number(e.target.value);
                                              handleUpdateLocalHito(obj._id, (prev) => {
                                                const metas = [...prev.metas];
                                                metas[idx] = { ...metas[idx], resultado: val };
                                                return { ...prev, metas };
                                              });
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                    {meta.resultado !== null && (
                                      <div className="mt-2">
                                        <div className={`text-xs font-medium ${cumple ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {cumple ? "✔ Cumple Objetivo" : (isAcumulativo ? `⚠ Progreso actual: ${valorEvaluado} / ${meta.esperado}` : "✘ No alcanza objetivo")}
                                        </div>
                                        {isAcumulativo && (
                                          <div className="text-[10px] text-slate-500 mt-1">
                                            Acumulado Total: <b>{valorEvaluado}</b> (Anteriores + Actual)
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Comentarios y Acciones */}
                            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Comentario del Evaluador</label>
                                <textarea
                                  className="w-full h-24 rounded border-slate-200 p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                  placeholder="Justificación de la evaluación..."
                                  value={localHito.comentario}
                                  onChange={(e) => handleUpdateLocalHito(obj._id, (prev) => ({ ...prev, comentario: e.target.value }))}
                                />
                              </div>
                              {data.comentarioManager && (
                                <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Feedback Anterior</label>
                                  <p className="text-sm text-slate-600 italic">"{data.comentarioManager}"</p>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2">
                                <Button variant="outline" size="sm" onClick={() => handleRecalculate(obj)} disabled={savingItems[obj._id]}>
                                  <RefreshCw className={`w-3 h-3 mr-2 ${savingItems[obj._id] ? "animate-spin" : ""}`} /> Recalcular
                                </Button>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleSaveItem(obj, "draft")} disabled={savingItems[obj._id]}>
                                  <Save className="w-4 h-4 mr-2" /> Guardar Avance
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Seleccioná un hito del cronograma para evaluar</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-amber-700 border-b pb-2">
                <Lightbulb className="w-5 h-5" /> Competencias
              </h2>
              {dashEmpleadoData?.aptitudes?.map((apt) => {
                const isExpanded = !!expandedItems[apt._id];
                const data = evaluacionData[apt._id];
                const localHito = data?.localHito;

                return (
                  <Card key={apt._id} className={`border-l-4 border-l-amber-500 shadow-sm transition-all ${isExpanded ? 'ring-2 ring-amber-100' : ''}`}>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggleExpand(apt)}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold text-slate-800 leading-tight">
                            {apt.nombre}
                          </CardTitle>
                          <p className="text-xs text-slate-500 line-clamp-2">{apt.descripcion}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-amber-600">{Math.round(apt.puntuacion)}%</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Score</div>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-6 px-6 bg-slate-50/30 border-t">
                        {/* Milestone Selector (Added for Competencias) */}
                        {apt.hitos && apt.hitos.length > 0 && (
                          <div className="mb-6 mt-4">
                            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Cronograma de Hitos</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {apt.hitos.map((h) => {
                                const status = getHitoStatus(h);
                                const colorClass = getHitoColorClass(status);
                                const isSelected = localHito?.periodo === h.periodo;
                                const isSelectable = status === "vencido" || status === "por_vencer" || status === "evaluado";

                                return (
                                  <div
                                    key={h.periodo}
                                    onClick={() => isSelectable && loadItemEvaluacion(apt, h.periodo)}
                                    className={`flex flex-col items-center justify-center p-2 rounded border ${colorClass} transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-slate-400' : ''} ${isSelectable ? 'cursor-pointer hover:brightness-95' : 'opacity-60 cursor-not-allowed'}`}
                                  >
                                    <span className="text-[10px] font-bold uppercase">{h.periodo}</span>
                                    <span className="text-xs font-semibold">{h.actual !== null ? `${Math.round(h.actual)}%` : "-"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {localHito ? (
                          <div className="space-y-6 mt-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Evaluando Período:</span>
                                <Badge className="bg-slate-900 text-white hover:bg-slate-800">{localHito.periodo}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Nivel:</span>
                                <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                                  {localHito.escala ? `${localHito.escala}/5` : "Sin calificar"}
                                </Badge>
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
                              <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Nivel de Competencia (1-5)</label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <button
                                      key={val}
                                      onClick={() => handleUpdateLocalHito(apt._id, (prev) => ({ ...prev, escala: val }))}
                                      className={`flex-1 h-12 rounded-lg border-2 font-bold text-lg transition-all ${localHito.escala === val ? "border-amber-500 bg-amber-50 text-amber-700 scale-105 shadow-md" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-amber-200"}`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                                  <span>Bajo Desempeño</span>
                                  <span>Excelente Desempeño</span>
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Comentario del Evaluador</label>
                                <textarea
                                  className="w-full h-24 rounded border-slate-200 p-2 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                                  placeholder="Justificación de la competencia..."
                                  value={localHito.comentario}
                                  onChange={(e) => handleUpdateLocalHito(apt._id, (prev) => ({ ...prev, comentario: e.target.value }))}
                                />
                              </div>

                              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => handleSaveItem(apt, "draft")} disabled={savingItems[apt._id]}>
                                <Save className="w-4 h-4 mr-2" /> Guardar Avance
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Seleccioná un hito del cronograma para evaluar</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: FEEDBACK */}
        {activeTab === "feedback" && (
          <div className="animate-in fade-in duration-300 space-y-8">
            {/* TIMELINE */}
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20"></div>
              <h3 className="text-sm font-bold text-slate-700 mb-8 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Cronograma de Feedback {anio}
              </h3>
              <div className="relative flex items-center justify-between px-4 md:px-12">
                {/* Connecting Line */}
                <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-200 -z-0 mx-8 md:mx-16"></div>

                {[
                  { id: "Q1", label: "Noviembre", sub: "Inicio", date: `${anio - 1}-11-01` },
                  { id: "Q2", label: "Febrero", sub: "Seguimiento", date: `${anio}-02-01` },
                  { id: "Q3", label: "Mayo", sub: "Seguimiento", date: `${anio}-05-01` },
                  { id: "FINAL", label: "Agosto", sub: "Cierre Anual", date: `${anio}-08-30` }
                ].map((p, idx) => {
                  const fb = feedbacks.find(f => f.periodo === p.id);
                  const isDone = fb?.estado === "REALIZADO" || fb?.estado === "CLOSED";
                  const isFinal = p.id === "FINAL";
                  return (
                    <div key={p.id} className="relative z-10 flex flex-col items-center group">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${isDone ? 'bg-emerald-500 border-emerald-500 scale-110' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                        {isDone && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="mt-3 text-center">
                        <div className={`text-sm font-bold ${isFinal ? 'text-blue-700' : 'text-slate-700'}`}>{p.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{p.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                { id: "Q1", title: "Feedback Noviembre", subtitle: "Primer Trimestre" },
                { id: "Q2", title: "Feedback Febrero", subtitle: "Segundo Trimestre" },
                { id: "Q3", title: "Feedback Mayo", subtitle: "Tercer Trimestre" },
                { id: "FINAL", title: "Cierre Anual (Agosto)", subtitle: "Evaluación Final", isFinal: true }
              ].map((conf) => {
                const periodo = conf.id;
                const fb = feedbacks.find(f => f.periodo === periodo) || { comentario: "", estado: "PENDIENTE" };
                const isFinal = conf.isFinal;
                const isExpanded = !!expandedFeedback[periodo];

                // Función local para calcular breakdown del periodo
                const getBreakdown = (p) => {
                  if (!dashEmpleadoData) return { objetivos: 0, competencias: 0, global: 0, detailsObj: [], detailsComp: [] };

                  // Objetivos
                  let totalObjScore = 0;
                  let totalObjWeight = 0;
                  const detailsObj = [];

                  dashEmpleadoData.objetivos?.forEach(obj => {
                    const hito = obj.hitos?.find(h => h.periodo === p);
                    if (hito && hito.actual !== null) {
                      totalObjScore += Number(hito.actual) * (obj.peso || 0);
                      totalObjWeight += (obj.peso || 0);
                      detailsObj.push({ nombre: obj.nombre, score: Number(hito.actual) });
                    }
                  });
                  const scoreObj = totalObjWeight > 0 ? (totalObjScore / totalObjWeight) : 0;

                  // Competencias
                  let totalCompScore = 0;
                  let totalCompWeight = 0;
                  const detailsComp = [];

                  dashEmpleadoData.aptitudes?.forEach(apt => {
                    const hito = apt.hitos?.find(h => h.periodo === p);
                    if (hito && hito.actual !== null) {
                      totalCompScore += Number(hito.actual) * (apt.peso || 0);
                      totalCompWeight += (apt.peso || 0);
                      detailsComp.push({ nombre: apt.nombre, score: Number(hito.actual) });
                    }
                  });
                  const scoreComp = totalCompWeight > 0 ? (totalCompScore / totalCompWeight) : 0;

                  // Global
                  const wObj = resumenEmpleado?.objetivos?.peso || 80;
                  const wComp = resumenEmpleado?.aptitudes?.peso || 20;
                  const global = ((scoreObj * wObj) + (scoreComp * wComp)) / (wObj + wComp);

                  return { objetivos: scoreObj, competencias: scoreComp, global, detailsObj, detailsComp };
                };

                const breakdown = getBreakdown(periodo);
                const scoreDisplay = breakdown.global;

                return (
                  <Card key={periodo} className={`flex flex-col transition-all hover:shadow-md ${isFinal ? "border-blue-200 ring-1 ring-blue-50 bg-blue-50/10" : "border-slate-200"}`}>
                    <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-normal">
                          {periodo === "FINAL" ? anio : periodo}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${fb.estado === "REALIZADO" ? "bg-emerald-500" : "bg-amber-400"}`}></div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => toggleFeedbackDetail(periodo)}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <CardTitle className={`text-base font-bold ${isFinal ? "text-blue-700" : "text-slate-800"}`}>
                        {conf.title}
                      </CardTitle>
                      <p className="text-xs text-slate-500 font-medium">
                        {conf.subtitle}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col gap-4 pt-4">
                      {isFinal && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-blue-800 font-bold uppercase tracking-wider">Score Final</div>
                            <div className="text-2xl font-black text-blue-600">{Math.round(scoreDisplay)}%</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1 bg-white/60 border border-blue-200 rounded px-2 py-1 flex justify-between">
                              <span className="text-blue-700 font-medium">Obj</span>
                              <span className="font-bold text-blue-700">{Math.round(breakdown.objetivos)}%</span>
                            </div>
                            <div className="flex-1 bg-white/60 border border-blue-200 rounded px-2 py-1 flex justify-between">
                              <span className="text-blue-700 font-medium">Comp</span>
                              <span className="font-bold text-blue-700">{Math.round(breakdown.competencias)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isFinal && (
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">Score Parcial:</span>
                            <span className="text-sm font-bold text-slate-700">{Math.round(scoreDisplay)}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1 bg-white border rounded px-2 py-1 flex justify-between">
                              <span className="text-slate-500">Obj</span>
                              <span className="font-bold text-blue-600">{Math.round(breakdown.objetivos)}%</span>
                            </div>
                            <div className="flex-1 bg-white border rounded px-2 py-1 flex justify-between">
                              <span className="text-slate-500">Comp</span>
                              <span className="font-bold text-amber-600">{Math.round(breakdown.competencias)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DETALLE EXPANDIBLE */}
                      {isExpanded && (
                        <div className="animate-in slide-in-from-top-2 duration-200 border-t pt-3 space-y-3">
                          {breakdown.detailsObj.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                                <Target className="w-3 h-3" /> Objetivos
                              </div>
                              <div className="space-y-1">
                                {breakdown.detailsObj.map((d, i) => (
                                  <div key={i} className="flex justify-between text-xs text-slate-600">
                                    <span className="truncate max-w-[140px]">{d.nombre}</span>
                                    <span className="font-semibold">{Math.round(d.score)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {breakdown.detailsComp.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" /> Competencias
                              </div>
                              <div className="space-y-1">
                                {breakdown.detailsComp.map((d, i) => (
                                  <div key={i} className="flex justify-between text-xs text-slate-600">
                                    <span className="truncate max-w-[140px]">{d.nombre}</span>
                                    <span className="font-semibold">{Math.round(d.score)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {breakdown.detailsObj.length === 0 && breakdown.detailsComp.length === 0 && (
                            <div className="text-xs text-slate-400 text-center italic">Sin datos evaluados</div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Feedback Manager</label>
                        <textarea
                          className="w-full h-20 rounded border-slate-200 p-2 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                          placeholder="Escribir feedback..."
                          value={fb.comentario}
                          onChange={(e) => handleFeedbackChange(periodo, e.target.value)}
                        />
                      </div>

                      {/* ACCIONES */}
                      <div className="flex items-center justify-between pt-2 gap-2">
                        <Badge variant="outline" className={`${fb.estado === "REALIZADO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {fb.estado === "REALIZADO" ? "Enviado" : "Pendiente"}
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSaveFeedback(periodo, fb.comentario, "PENDIENTE")}>
                            <Save className="w-3 h-3 mr-1" /> Guardar
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleSaveFeedback(periodo, fb.comentario, "REALIZADO")}>
                            <Send className="w-3 h-3 mr-1" /> Enviar Feedback
                          </Button>
                        </div>
                      </div>

                      {/* FLOW STEPPER */}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between relative">
                          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-0"></div>
                          {[
                            { label: "Borrador", status: "PENDIENTE" },
                            { label: "Enviado al Empleado", status: "REALIZADO" },
                            { label: "En RRHH", status: "PENDING_HR" },
                            { label: "Cerrado", status: "CLOSED" }
                          ].map((step, idx) => {
                            const order = { "PENDIENTE": 0, "REALIZADO": 1, "PENDING_HR": 2, "CLOSED": 3 };
                            const currentStep = order[fb.estado] ?? 0;
                            const isActive = idx <= currentStep;
                            const isCurrent = idx === currentStep;

                            const icons = {
                              "PENDIENTE": FileEdit,
                              "REALIZADO": Send,
                              "PENDING_HR": Users,
                              "CLOSED": CheckCircle
                            };
                            const Icon = icons[step.status] || FileEdit;

                            return (
                              <div key={idx} className="relative z-10 flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110' : 'bg-white border-slate-300 text-slate-400'}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className={`text-[8px] mt-1 font-medium ${isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>{step.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* EMPLOYEE RESPONSE */}
                      {(fb.estado === "REALIZADO" || fb.estado === "PENDING_HR" || fb.estado === "CLOSED") && (
                        <div className="bg-slate-50 p-3 rounded border border-slate-100 mt-3 space-y-2 opacity-80">
                          <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                            <UserCircle2 className="w-3 h-3" /> Respuesta del Colaborador
                          </label>
                          <div className="flex items-center gap-4 text-xs">
                            <div className={`flex items-center gap-1 ${fb.acuerdo === true ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                              <div className={`w-3 h-3 rounded-full border ${fb.acuerdo === true ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}></div>
                              Estoy de acuerdo
                            </div>
                            <div className={`flex items-center gap-1 ${fb.acuerdo === false ? "text-rose-700 font-bold" : "text-slate-400"}`}>
                              <div className={`w-3 h-3 rounded-full border ${fb.acuerdo === false ? "bg-rose-500 border-rose-500" : "border-slate-300"}`}></div>
                              En desacuerdo
                            </div>
                          </div>
                          {fb.comentarioEmpleado && (
                            <p className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-2">
                              "{fb.comentarioEmpleado}"
                            </p>
                          )}
                          {!fb.comentarioEmpleado && (
                            <p className="text-[10px] text-slate-400 italic">Sin comentarios del colaborador</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>


          </div>
        )}
      </div>
    </div>
  );
}
