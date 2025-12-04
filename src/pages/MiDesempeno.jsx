import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { dashEmpleado } from "@/lib/dashboard";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Lock,
  Calendar,
  UserCircle2,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ListChecks,
  FileSignature,
  Info,
  BarChart3,
  Hourglass
} from "lucide-react";

// === UI helpers ===
const StatusBadge = ({ status }) => {
  const styles = {
    "SENT": "bg-blue-50 text-blue-700 border-blue-200",
    "REALIZADO": "bg-blue-50 text-blue-700 border-blue-200", // Mapped to SENT style
    "ACKNOWLEDGED": "bg-purple-50 text-purple-700 border-purple-200",
    "CLOSED": "bg-slate-100 text-slate-600 border-slate-200",
    "PENDIENTE": "bg-amber-50 text-amber-700 border-amber-200",
    "DRAFT": "bg-amber-50 text-amber-700 border-amber-200"
  };

  const labels = {
    "SENT": "Enviado",
    "REALIZADO": "Enviado",
    "ACKNOWLEDGED": "En RRHH",
    "CLOSED": "Cerrado",
    "PENDIENTE": "Borrador",
    "DRAFT": "Borrador"
  };

  return (
    <Badge variant="outline" className={`${styles[status] || styles["PENDIENTE"]} font-medium`}>
      {labels[status] || "Pendiente"}
    </Badge>
  );
};

// === Objective Card Component (Refined) ===
const ObjectiveCard = ({ obj, currentPeriod, expanded, onToggle }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);

  useEffect(() => {
    setSelectedPeriod(currentPeriod);
  }, [currentPeriod]);

  // Find current hito for the selected period
  const currentHito = obj.hitos?.find(h => h.periodo === selectedPeriod);
  const hasResult = currentHito?.actual !== null && currentHito?.actual !== undefined;

  // Helper for hito status color
  const getHitoColorClass = (h) => {
    if (h.actual !== null) return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (h.periodo === currentPeriod) return "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-300";
    return "bg-slate-50 border-slate-100 text-slate-400";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Card Header (Clickable for Expand/Collapse) */}
      <div
        className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2 text-xs text-slate-500">
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-normal flex items-center gap-1">
                <Hourglass className="w-3 h-3" /> {obj.frecuencia || "Anual"}
              </Badge>
              <span>Peso: <span className="font-bold text-slate-700">{obj.peso}%</span></span>
            </div>
            <h4 className="font-bold text-slate-800 text-base leading-tight">{obj.nombre}</h4>
          </div>
          <div className="text-right min-w-[80px] flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-black ${obj.progreso > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                {Math.round(obj.progreso)}%
              </div>
              {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progreso</div>
          </div>
        </div>

        {/* Cronograma de Hitos (Always Visible or Collapsible? User said "objetivos deberian poder colapzar") 
            Let's keep the header visible and collapse the details below.
        */}
      </div>

      {/* Collapsible Content */}
      {expanded && (
        <div className="px-5 pb-5 animate-in slide-in-from-top-2">
          {/* Cronograma de Hitos (Boxes) */}
          <div className="mb-6 border-t border-slate-100 pt-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Cronograma de Hitos</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {obj.hitos?.map((h) => {
                const colorClass = getHitoColorClass(h);
                const isSelected = h.periodo === selectedPeriod;
                return (
                  <div
                    key={h.periodo}
                    onClick={(e) => { e.stopPropagation(); setSelectedPeriod(h.periodo); }}
                    className={`flex flex-col items-center justify-center p-2 rounded border min-w-[70px] transition-all cursor-pointer ${colorClass} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <span className="text-[10px] font-bold uppercase">{h.periodo}</span>
                    <span className="text-xs font-semibold">{h.actual !== null ? `${Math.round(h.actual)}%` : "-"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Period Evaluation Box */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Evaluando Período:</span>
                <Badge className="bg-slate-900 text-white hover:bg-slate-800">{selectedPeriod}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Score Hito:</span>
                <span className={`text-lg font-bold ${hasResult ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {hasResult ? `${Number(currentHito.actual).toFixed(1)}%` : "0.0%"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Metas / KPI */}
              {/* Metas / KPI */}
              <div className="space-y-3">
                {currentHito?.metas?.map((meta, idx) => (
                  <div key={idx} className="pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="text-sm text-slate-700 font-medium mb-1">{meta.nombre || "Meta sin descripción"}</div>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-1 rounded">
                        Esperado: {meta.esperado !== null ? meta.esperado : "N/A"} {meta.unidad}
                      </span>
                      {obj.metas?.[idx]?.modoAcumulacion === "acumulativo" && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">Acumulativo</span>
                      )}
                      {obj.metas?.[idx]?.reglaCierre && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                          Cierre: {obj.metas?.[idx]?.reglaCierre}
                        </span>
                      )}
                      {obj.metas?.[idx]?.reconoceEsfuerzo && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">Reconoce Esfuerzo</span>
                      )}
                    </div>
                  </div>
                ))}
                {(!currentHito?.metas || currentHito.metas.length === 0) && (
                  <div className="text-sm text-slate-400 italic">Sin metas definidas para este hito.</div>
                )}
              </div>

              {/* Result Input Display (Read Only) */}
              <div className="flex justify-end">
                <div className="w-32">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Resultado</label>
                  <div className="h-9 w-full rounded border border-slate-200 bg-slate-50 flex items-center px-3 text-sm text-slate-600 font-medium">
                    {hasResult ? currentHito.actual : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluator Comment */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Comentario del Evaluador</label>
            <p className="text-sm text-slate-600 italic leading-relaxed">
              {currentHito?.comentario || "Sin comentarios."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function MiDesempeno() {
  const { user } = useAuth();
  const empleadoNombre = user?.empleado?.nombre || user?.empleadoId?.nombre || user?.nombre || "Colaborador";
  const empleadoId = user?.empleado?._id || user?.empleadoId?._id || user?.empleadoId || user?._id;

  const [data, setData] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({}); // { [id]: boolean }

  // Refs for scrolling
  const sectionFeedbackRef = useRef(null);
  const sectionDetailsRef = useRef(null);
  const sectionValidationRef = useRef(null);

  // Estado local para comentarios/ack antes de guardar
  const [localComment, setLocalComment] = useState("");
  const [localAck, setLocalAck] = useState(null);



  // 1. Cargar Dashboard (Objetivos/Aptitudes)
  const fetchDash = useCallback(async () => {
    if (!empleadoId) return;
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const res = await dashEmpleado(empleadoId, currentYear);
      if (res) {
        const normalized = { ...res };
        if (normalized.objetivos?.items && !Array.isArray(normalized.objetivos)) {
          normalized.objetivos = normalized.objetivos.items;
        }
        if (normalized.aptitudes?.items && !Array.isArray(normalized.aptitudes)) {
          normalized.aptitudes = normalized.aptitudes.items;
        }
        setData(normalized);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  // 2. Cargar Feedbacks
  const fetchFeedbacks = useCallback(async () => {
    if (!empleadoId) return;
    try {
      const res = await api(`/feedbacks/empleado/${empleadoId}`);
      const fetched = Array.isArray(res) ? res : [];

      // Generar lista completa de 4 periodos para asegurar que siempre se vean
      const currentYear = new Date().getFullYear();
      const periods = ["Q1", "Q2", "Q3", "FINAL"];

      const fullList = periods.map(p => {
        const found = fetched.find(f => f.periodo === p);
        if (found) return found;

        // Si no existe, crear placeholder
        return {
          _id: `placeholder-${p}`,
          periodo: p,
          year: currentYear,
          estado: "PENDIENTE",
          comentario: "",
          isPlaceholder: true
        };
      });

      setFeedbacks(fullList);

      // Seleccionar el primero si no hay selección
      if (fullList.length > 0 && !selectedFeedback) {
        // Intentar seleccionar el más reciente que no sea placeholder, o el primero
        const lastReal = [...fullList].reverse().find(f => !f.isPlaceholder);
        setSelectedFeedback(lastReal || fullList[0]);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    }
  }, [empleadoId, selectedFeedback]);

  useEffect(() => {
    fetchDash();
    fetchFeedbacks();
  }, [fetchDash, fetchFeedbacks]);

  // Sincronizar estado local al cambiar selección
  useEffect(() => {
    if (selectedFeedback) {
      setLocalComment(selectedFeedback.comentarioEmpleado || "");
      setLocalAck(selectedFeedback.empleadoAck?.estado || null);
    }
  }, [selectedFeedback]);

  // Calcular resultados para el periodo seleccionado
  const periodResults = useMemo(() => {
    if (!data || !selectedFeedback) return { objetivos: [], aptitudes: [], scores: { obj: 0, comp: 0, global: 0 } };
    const p = selectedFeedback.periodo;

    let totalObjScore = 0;
    let totalObjWeight = 0;
    let totalCompScore = 0;
    let totalCompWeight = 0;

    const mapItems = (items, type) => {
      return items.map(it => {
        const hito = it.hitos?.find(h => h.periodo === p);
        const score = hito?.actual ?? 0;

        if (type === 'obj') {
          totalObjScore += Number(score) * (it.peso || 0);
          totalObjWeight += (it.peso || 0);
        } else {
          totalCompScore += Number(score) * (it.peso || 0);
          totalCompWeight += (it.peso || 0);
        }

        return {
          ...it,
          hitoActual: hito,
          scorePeriodo: score
        };
      });
    };

    const objetivos = mapItems(data.objetivos || [], 'obj');
    const aptitudes = mapItems(data.aptitudes || [], 'comp');

    const scoreObj = totalObjWeight > 0 ? (totalObjScore / totalObjWeight) : 0;
    const scoreComp = totalCompWeight > 0 ? (totalCompScore / totalCompWeight) : 0;

    // Asumimos 80/20 si no hay config global
    const wObj = 80;
    const wComp = 20;
    const global = ((scoreObj * wObj) + (scoreComp * wComp)) / (wObj + wComp);

    return {
      objetivos,
      aptitudes,
      scores: {
        obj: scoreObj,
        comp: scoreComp,
        global
      }
    };
  }, [data, selectedFeedback]);

  // Guardar respuesta (Ack/Comment)
  const handleSaveResponse = async () => {
    if (!selectedFeedback) return;
    try {
      const payload = {
        empleado: empleadoId,
        year: selectedFeedback.year,
        periodo: selectedFeedback.periodo,
        estado: selectedFeedback.estado === "SENT" ? "ACKNOWLEDGED" : selectedFeedback.estado,
        comentario: selectedFeedback.comentario,
        comentarioEmpleado: localComment,
        empleadoAck: {
          estado: localAck,
          fecha: new Date()
        }
      };

      await api("/feedback", {
        method: "POST",
        body: payload
      });

      toast.success("Respuesta enviada a RRHH correctamente.");
      fetchFeedbacks();
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar respuesta.");
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToSection = (ref) => {
    const yOffset = -100; // Offset for sticky header
    const element = ref.current;
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (!user) return <div className="p-6 text-center">Iniciá sesión.</div>;

  const currentYear = new Date().getFullYear();
  const timelineItems = [
    { id: "Q1", label: "Noviembre", sub: "Inicio", date: `${currentYear - 1}-11-01` },
    { id: "Q2", label: "Febrero", sub: "Seguimiento", date: `${currentYear}-02-01` },
    { id: "Q3", label: "Mayo", sub: "Seguimiento", date: `${currentYear}-05-01` },
    { id: "FINAL", label: "Agosto", sub: "Cierre Anual", date: `${currentYear}-08-30` }
  ];

  const evaluatorName = selectedFeedback?.creadoPor?.nombre
    ? `${selectedFeedback.creadoPor.nombre} ${selectedFeedback.creadoPor.apellido}`
    : "Evaluador no asignado";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Negro */}
      <div className="bg-slate-900 text-white pt-12 pb-24 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-[90%] mx-auto relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Hola, {empleadoNombre}</h1>
              <p className="text-slate-400 text-lg">Seguimiento de evaluaciones y feedback continuo</p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-sm text-slate-400 uppercase tracking-wider font-medium mb-1">Año en curso</div>
              <div className="text-2xl font-bold">{currentYear}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[90%] mx-auto px-4 md:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">

          {/* SIDEBAR NAVIGATION (Sticky) */}
          <div className="hidden lg:block space-y-2 sticky top-24 h-fit">
            <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-slate-200/60 shadow-sm">
              <button
                onClick={() => scrollToSection(sectionFeedbackRef)}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium"
              >
                <LayoutDashboard className="w-5 h-5" />
                Resultado Feedback
              </button>
              <button
                onClick={() => scrollToSection(sectionDetailsRef)}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium"
              >
                <ListChecks className="w-5 h-5" />
                Objetivos y Competencias
              </button>
              <button
                onClick={() => scrollToSection(sectionValidationRef)}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium"
              >
                <FileSignature className="w-5 h-5" />
                Conformidad
              </button>
            </div>
          </div>

          {/* MAIN CONTENT (Scrollable) */}
          <div className="space-y-12">

            {/* SECTION 1: FEEDBACK RESULTS (Timeline + Summary) */}
            <div ref={sectionFeedbackRef} className="scroll-mt-32">
              {/* Timeline Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Cronograma Anual
                </h3>

                <div className="relative flex items-center justify-between px-4 md:px-12">
                  <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-100 -z-0 mx-8 md:mx-16"></div>
                  {timelineItems.map((p) => {
                    const fb = feedbacks.find(f => f.periodo === p.id);
                    const isSelected = selectedFeedback?.periodo === p.id;
                    const isDone = fb?.estado === "SENT" || fb?.estado === "REALIZADO" || fb?.estado === "ACKNOWLEDGED" || fb?.estado === "CLOSED";
                    const isFuture = !fb || fb.isPlaceholder;

                    let statusColor = "bg-white border-slate-300 text-slate-400";
                    if (isDone) statusColor = "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30";
                    else if (isSelected) statusColor = "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110";
                    else if (!isFuture) statusColor = "bg-white border-amber-400 text-amber-500";

                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          const found = feedbacks.find(f => f.periodo === p.id);
                          if (found) setSelectedFeedback(found);
                        }}
                        className="relative z-10 flex flex-col items-center group focus:outline-none"
                      >
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${statusColor} ${isSelected ? 'scale-125' : 'group-hover:scale-110'}`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-current'}`} />}
                        </div>
                        <div className={`mt-4 text-center transition-all ${isSelected ? 'transform translate-y-1' : ''}`}>
                          <div className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{p.label}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{p.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedFeedback ? (
                <div className="space-y-6">
                  {/* Header Feedback */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                          <MessageSquare className="w-6 h-6 text-blue-600" />
                          Feedback {selectedFeedback.periodo}
                        </h2>
                        <div className="flex flex-col mt-1 ml-9">
                          <span className="text-sm text-slate-500">
                            {selectedFeedback.isPlaceholder
                              ? "Este periodo aún no ha sido evaluado."
                              : `Recibido el ${selectedFeedback.submittedToEmployeeAt ? new Date(selectedFeedback.submittedToEmployeeAt).toLocaleDateString() : "—"}`
                            }
                          </span>
                          {!selectedFeedback.isPlaceholder && (
                            <span className="text-xs font-bold text-slate-400 uppercase mt-1">
                              Evaluado por: <span className="text-slate-600">{evaluatorName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={selectedFeedback.estado} />
                    </div>

                    {!selectedFeedback.isPlaceholder && (
                      <div className="bg-slate-50/80 p-6 rounded-xl border border-slate-200/60">
                        <label className="text-xs font-bold text-blue-600 uppercase mb-3 block flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4" /> Comentarios del Líder
                        </label>
                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedFeedback.comentario || "Sin comentarios."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary Scores */}
                  {!selectedFeedback.isPlaceholder && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                        <div className="text-sm text-slate-500 font-medium mb-1">Score Objetivos</div>
                        <div className="text-3xl font-black text-blue-600">{Math.round(periodResults.scores.obj)}%</div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                        <div className="text-sm text-slate-500 font-medium mb-1">Score Competencias</div>
                        <div className="text-3xl font-black text-amber-500">{Math.round(periodResults.scores.comp)}%</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-600/20 flex flex-col items-center justify-center text-white">
                        <div className="text-sm text-blue-100 font-medium mb-1">Score Global</div>
                        <div className="text-3xl font-black">{Math.round(periodResults.scores.global)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
                  Seleccioná un periodo para ver el detalle.
                </div>
              )}
            </div>

            {/* SECTION 2: DETAILED VIEW (Objectives & Competencies) */}
            <div ref={sectionDetailsRef} className="scroll-mt-32">
              {!selectedFeedback || selectedFeedback.isPlaceholder ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
                  No hay detalles disponibles para este periodo.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Objetivos */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800 text-lg">Objetivos</h3>
                    </div>
                    {periodResults.objetivos.map(obj => (
                      <ObjectiveCard
                        key={obj._id}
                        obj={obj}
                        currentPeriod={selectedFeedback.periodo}
                        expanded={expandedItems[obj._id]}
                        onToggle={() => toggleExpand(obj._id)}
                      />
                    ))}
                    {periodResults.objetivos.length === 0 && <div className="p-6 text-center text-slate-400 italic bg-white rounded-xl border border-dashed">No hay objetivos asignados.</div>}
                  </div>

                  {/* Competencias */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-slate-800 text-lg">Competencias</h3>
                    </div>
                    {periodResults.aptitudes.map(apt => (
                      <div key={apt._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <button
                          onClick={() => toggleExpand(apt._id)}
                          className="w-full p-5 flex items-center justify-between text-left"
                        >
                          <div className="flex-1 pr-4">
                            <div className="font-bold text-slate-800">{apt.nombre}</div>
                            <div className="mt-3 w-full max-w-xs h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: `${Math.max(0, Math.min(100, Math.round(apt.scorePeriodo)))}%` }}></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{Math.round(apt.scorePeriodo)}%</span>
                            {expandedItems[apt._id] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </div>
                        </button>

                        {expandedItems[apt._id] && (
                          <div className="p-5 bg-slate-50/50 border-t border-slate-100 text-sm space-y-3 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="bg-white p-3 rounded border border-slate-200">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Descripción</div>
                                <div className="text-slate-700">{apt.descripcion || "Sin descripción"}</div>
                              </div>
                              <div className="bg-white p-3 rounded border border-slate-200">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Resultado Obtenido</div>
                                <div className="text-slate-700 font-medium">{apt.hitoActual?.actual ?? "—"}</div>
                                {apt.hitoActual?.comentario && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 text-slate-500 italic">
                                    "{apt.hitoActual.comentario}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {periodResults.aptitudes.length === 0 && <div className="p-6 text-center text-slate-400 italic bg-white rounded-xl border border-dashed">No hay competencias asignadas.</div>}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: VALIDATION */}
            <div ref={sectionValidationRef} className="scroll-mt-32">
              {!selectedFeedback || selectedFeedback.isPlaceholder ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
                  No hay validación disponible para este periodo.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Conformidad y Validación
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Comentarios para RRHH</label>
                      <textarea
                        className="w-full h-32 rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                        placeholder="Escribí tus comentarios sobre este feedback..."
                        value={localComment}
                        onChange={(e) => setLocalComment(e.target.value)}
                        disabled={selectedFeedback.estado === "CLOSED"}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => setLocalAck("ACK")}
                          disabled={selectedFeedback.estado === "CLOSED"}
                          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${localAck === "ACK"
                            ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${localAck === "ACK" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400"}`}>
                            {localAck === "ACK" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          Estoy de acuerdo
                        </button>
                        <button
                          onClick={() => setLocalAck("CONTEST")}
                          disabled={selectedFeedback.estado === "CLOSED"}
                          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${localAck === "CONTEST"
                            ? "bg-rose-100 text-rose-700 ring-2 ring-rose-500 ring-offset-2"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${localAck === "CONTEST" ? "border-rose-600 bg-rose-600 text-white" : "border-slate-400"}`}>
                            {localAck === "CONTEST" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          En desacuerdo
                        </button>
                      </div>

                      <Button
                        onClick={handleSaveResponse}
                        disabled={selectedFeedback.estado === "CLOSED" || !localAck}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 px-8"
                      >
                        {selectedFeedback.estado === "CLOSED" ? "Cerrado" : "Enviar a RRHH"}
                      </Button>
                    </div>

                    {selectedFeedback.estado === "CLOSED" && (
                      <div className="mt-4 p-4 bg-slate-50 text-slate-500 text-sm rounded-xl flex items-center gap-3 border border-slate-100">
                        <Lock className="w-5 h-5" />
                        <span>Este feedback está cerrado y no se puede modificar.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
