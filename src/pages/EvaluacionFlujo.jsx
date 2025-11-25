// src/pages/EvaluacionFlujo.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import TraceabilityCard from "@/components/seguimiento/TraceabilityCard";
import { useAuth } from "@/context/AuthContext";
import { api, API_ORIGIN } from "@/lib/api";
import { evaluarCumple, calcularResultadoGlobal } from "@/lib/evaluarCumple";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { dashEmpleado } from "@/lib/dashboard";
import { UserCircle2, CalendarClock } from "lucide-react";

/* ===================== Constantes y helpers ===================== */

const ESTADOS = [
  {
    code: "NO_ENVIADOS",
    label: "No enviados",
    color: "bg-slate-100 text-slate-700",
    ring: "ring-slate-300",
  },
  {
    code: "PENDING_EMPLOYEE",
    label: "Enviados",
    color: "bg-amber-100 text-amber-800",
    ring: "ring-amber-300",
  },
  {
    code: "PENDING_HR",
    label: "En RRHH",
    color: "bg-blue-100 text-blue-800",
    ring: "ring-blue-300",
  },
  {
    code: "CLOSED",
    label: "Cerrados",
    color: "bg-emerald-100 text-emerald-800",
    ring: "ring-emerald-300",
  },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-[width] duration-300"
      style={{
        width: `${Math.max(0, Math.min(100, Math.round(value)))}%`,
      }}
    />
  </div>
);

function buildResumenEmpleado(data) {
  if (!data) return null;

  let objetivos = [];
  let aptitudes = [];

  if (Array.isArray(data.objetivos)) {
    objetivos = data.objetivos;
  } else if (Array.isArray(data.objetivos?.items)) {
    objetivos = data.objetivos.items;
  }

  if (Array.isArray(data.aptitudes)) {
    aptitudes = data.aptitudes;
  } else if (Array.isArray(data.aptitudes?.items)) {
    aptitudes = data.aptitudes.items;
  }

  const pesos = objetivos.map((o) => Number(o.peso ?? o.pesoBase ?? 0));
  const prog = objetivos.map((o) => Number(o.progreso ?? 0));
  const totalPeso = pesos.reduce((a, b) => a + b, 0) || 0;

  const scoreObj =
    totalPeso > 0
      ? pesos.reduce((acc, p, i) => acc + p * (prog[i] || 0), 0) / totalPeso
      : prog.length
        ? prog.reduce((a, b) => a + b, 0) / prog.length
        : 0;

  const punt = aptitudes.map((a) => Number(a.puntuacion ?? a.score ?? 0));
  const scoreApt = punt.length
    ? punt.reduce((a, b) => a + b, 0) / punt.length
    : 0;

  const global = (scoreObj + scoreApt) / 2;

  return {
    objetivos: { cantidad: objetivos.length, peso: totalPeso, score: scoreObj },
    aptitudes: { cantidad: aptitudes.length, score: scoreApt },
    global,
  };
}

// --- deduplicador robusto por _id o (nombre+unidad) ---
function dedupeMetas(arr = []) {
  const seen = new Set();
  const out = [];
  for (const m of arr) {
    const key = m?._id ? `id:${m._id}` : `nu:${m?.nombre}__${m?.unidad}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

function deepCloneMetas(metas = []) {
  const cloned = metas.map((m) => ({
    _id: m._id,
    nombre: m.nombre,
    esperado: m.esperado,
    unidad: m.unidad,
    operador: m.operador || ">=",
    resultado: m.resultado ?? null,
    cumple: !!m.cumple && m.resultado != null ? !!m.cumple : false,
    peso: m.peso ?? m.pesoBase ?? null,
  }));
  return dedupeMetas(cloned);
}

function parsePeriodoToDate(periodoStr) {
  if (!periodoStr || typeof periodoStr !== "string") return null;
  // soporta "2025M10" o "2025Q1" o "2025-10"
  const mMatch = periodoStr.match(/^(\d{4})M(\d{1,2})$/i);
  if (mMatch) {
    const y = Number(mMatch[1]);
    const m = Number(mMatch[2]) - 1;
    return new Date(y, m, 28);
  }
  const qMatch = periodoStr.match(/^(\d{4})Q([1-4])$/i);
  if (qMatch) {
    const y = Number(qMatch[1]);
    const q = Number(qMatch[2]) - 1; // 0..3
    const m = q * 3 + 2; // fin de trimestre aprox
    return new Date(y, m, 28);
  }
  const yMatch = periodoStr.match(/^(\d{4})$/);
  if (yMatch) {
    const y = Number(yMatch[1]);
    return new Date(y, 11, 31);
  }
  const d = new Date(periodoStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getFechaReferencia(item, hito) {
  if (hito?.fecha) {
    const d = new Date(hito.fecha);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (item?.fechaLimite) {
    const d = new Date(item.fechaLimite);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const per = hito?.periodo || item?.periodo || null;
  if (per) return parsePeriodoToDate(per);
  return null;
}

/** Estado híbrido igual que el Gantt */
function getHybridStatus(sourceData, fechaRef) {
  const dbStatus = sourceData?.estado;

  // Si hay estado real (PENDING_EMPLOYEE, PENDING_HR, CLOSED, etc.) lo respetamos.
  if (dbStatus && dbStatus !== "MANAGER_DRAFT") return dbStatus;

  if (!fechaRef) return "pendiente";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ref = new Date(fechaRef);
  ref.setHours(23, 59, 59, 999);

  const diffMs = ref - hoy;
  const diffDays = Math.ceil(diffMs / MS_PER_DAY);

  if (diffDays < 0) return "vencido";
  if (diffDays <= 7) return "por_vencer";
  return "pendiente";
}

/**
 * Ahora devolvemos directamente el statusKey:
 * - "vencido" / "por_vencer" / "pendiente"
 * - "PENDING_EMPLOYEE" / "PENDING_HR" / "CLOSED" / otros estados reales
 */
function classifyBucket(fecha, sourceData) {
  const statusKey = getHybridStatus(sourceData || {}, fecha);
  return statusKey;
}

function bucketConfig(bucket) {
  switch (bucket) {
    case "por_vencer":
      return {
        label: "Por vencer (7 días)",
        chip: "🔥 Por vencer",
        badgeClass: "bg-amber-100 text-amber-800 ring-amber-200",
        canEdit: true,
      };
    case "vencido":
      return {
        label: "Vencidos",
        chip: "⚠ Vencido",
        badgeClass: "bg-rose-100 text-rose-800 ring-rose-200",
        canEdit: true,
      };
    case "PENDING_EMPLOYEE":
      return {
        label: "Enviado al Empleado",
        chip: "📨 Enviado",
        badgeClass: "bg-cyan-100 text-cyan-800 ring-cyan-200",
        canEdit: false,
      };
    case "PENDING_HR":
      return {
        label: "En RRHH",
        chip: "🏢 En RRHH",
        badgeClass: "bg-blue-100 text-blue-800 ring-blue-200",
        canEdit: false,
      };
    case "CLOSED":
      return {
        label: "Cerrado",
        chip: "✅ Cerrado",
        badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200",
        canEdit: false,
      };
    case "pendiente":
    default:
      return {
        label: "Pendientes (futuros)",
        chip: "⏳ Futuro",
        badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",
        canEdit: false,
      };
  }
}

const fotoSrc = (empleado) => {
  const url = empleado?.fotoUrl;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url; // absoluta
  const base =
    typeof API_ORIGIN === "string" && API_ORIGIN
      ? API_ORIGIN
      : window.location.origin;
  return `${base.replace(/\/+$/, "")}/${String(url).replace(/^\/+/, "")}`;
};

/* ===================== Componente principal ===================== */

export default function EvaluacionFlujo() {
  const { plantillaId, periodo, empleadoId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ===== Roles y acceso =====
  const esReferente = Boolean(
    (Array.isArray(user?.referenteAreas) && user.referenteAreas.length > 0) ||
    (Array.isArray(user?.referenteSectors) && user.referenteSectors.length > 0)
  );
  const esDirector = user?.rol === "directivo" || user?.isRRHH === true;
  const esSuperAdmin = user?.rol === "superadmin";
  const esVisor = user?.rol === "visor";
  const puedeVer = esReferente || esDirector || esSuperAdmin || esVisor;

  // ===== Año de trabajo =====
  const [anio] = useState(
    state?.anio ??
    Number(String(periodo || new Date().getFullYear()).slice(0, 4))
  );

  // ===== Empleado en foco (sala de evaluación) =====
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(
    empleadoId ||
    state?.empleado?._id ||
    state?.empleadosDelItem?.[0]?._id ||
    user?.empleado?._id ||
    null
  );
  const [empleadoInfo, setEmpleadoInfo] = useState(
    state?.empleado || state?.empleadosDelItem?.[0] || user?.empleado || null
  );

  // ===== Ítem / hito actual =====
  const [itemSeleccionado, setItemSeleccionado] = useState(
    state?.itemSeleccionado ?? null
  );
  const [periodoActivo, setPeriodoActivo] = useState(
    state?.hito?.periodo || periodo || null
  );
  const [localHito, setLocalHito] = useState(
    state?.hito
      ? {
        periodo: state.hito.periodo,
        fecha: state.hito.fecha,
        metas: deepCloneMetas(state.hito.metas ?? []),
        estado: state.hito.estado ?? "MANAGER_DRAFT",
        actual: state.hito.actual ?? null,
        comentario: state.hito.comentario ?? "",
        escala: state.hito.escala ?? null,
      }
      : null
  );
  const [comentarioManager, setComentarioManager] = useState(
    state?.hito?.comentarioManager ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ===== Dashboard / mapa del empleado =====
  const [dashEmpleadoData, setDashEmpleadoData] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

  // filtros del mapa
  const [tipoMapaFiltro, setTipoMapaFiltro] = useState("todos"); // todos | objetivo | aptitud
  const [bucketFiltro, setBucketFiltro] = useState("todos"); // pendiente | por_vencer | vencido | todos
  const [searchMapa, setSearchMapa] = useState("");

  // ===== Flags de evaluación =====
  const isAptitud =
    itemSeleccionado?._tipo === "aptitud" ||
    itemSeleccionado?.tipo === "aptitud";
  const scaleToPercent = (v) => (v ? v * 20 : null);

  // editable: solo MANAGER_DRAFT + ventana temporal (no futuros lejanos)
  const fechaEvalRef = useMemo(() => {
    if (!itemSeleccionado && !localHito) return null;

    // Si el hito local ya tiene fecha, priorizamos esa
    if (localHito?.fecha) {
      const d = new Date(localHito.fecha);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return getFechaReferencia(itemSeleccionado, localHito);
  }, [itemSeleccionado, localHito]);

  const bucketActual = useMemo(() => {
    if (!fechaEvalRef && !localHito) return "pendiente";
    return classifyBucket(fechaEvalRef, localHito);
  }, [fechaEvalRef, localHito]);

  const bucketCfg = bucketConfig(bucketActual);
  const editableTemporal = bucketCfg.canEdit;
  const editable =
    editableTemporal &&
    (localHito?.estado === "MANAGER_DRAFT" || !localHito?.estado);

  /* ===================== builders / loaders ===================== */

  function buildBlankLocalHito(basePlantilla, periodoStr) {
    const baseMetas = Array.isArray(basePlantilla?.metas)
      ? basePlantilla.metas
      : [];
    return {
      periodo: periodoStr,
      fecha: null,
      estado: "MANAGER_DRAFT",
      metas: dedupeMetas(
        deepCloneMetas(baseMetas).map((m) => ({
          ...m,
          resultado: null,
          cumple: false,
        }))
      ),
      actual: null,
      comentario: "",
      escala: null,
    };
  }

  const hydrateFromEvaluacion = (plantillaBase, periodoSel, ev) => {
    if (!plantillaBase) return;

    const metas = dedupeMetas(
      Array.isArray(ev?.metasResultados) && ev.metasResultados.length
        ? deepCloneMetas(ev.metasResultados)
        : deepCloneMetas(plantillaBase?.metas ?? [])
    );

    setLocalHito({
      periodo: periodoSel,
      fecha: ev?.fecha ?? null,
      estado: ev?.estado ?? "MANAGER_DRAFT",
      metas,
      actual:
        ev?.actual ?? (metas.length ? calcularResultadoGlobal(metas) : null),
      comentario: ev?.comentario ?? "",
      escala: ev?.escala ?? null,
    });
    setComentarioManager(ev?.comentarioManager ?? "");
  };

  const loadEvaluacion = async (empleado, plantilla, periodoSel) => {
    if (!empleado || !plantilla || !periodoSel) return;
    try {
      const resp = await api(
        `/evaluaciones?empleado=${empleado}&plantillaId=${plantilla._id}&periodo=${periodoSel}`
      );
      const arr = Array.isArray(resp) ? resp : resp?.items || [];
      const ev = arr[0] || null;

      if (ev) {
        hydrateFromEvaluacion(plantilla, periodoSel, ev);
      } else {
        setLocalHito(buildBlankLocalHito(plantilla, periodoSel));
        setComentarioManager("");
      }

      setPeriodoActivo((prev) => prev || periodoSel);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la evaluación del período seleccionado.");
    }
  };

  function resetToBlank(plantilla, periodoStr) {
    setLocalHito(buildBlankLocalHito(plantilla, periodoStr));
    setComentarioManager("");
  }

  /* ===================== efectos: empleado / dashboard ===================== */

  // Si no hay empleadoInfo, lo traigo
  useEffect(() => {
    (async () => {
      if (!selectedEmpleadoId || empleadoInfo) return;
      try {
        const emp = await api(`/empleados/${selectedEmpleadoId}`);
        setEmpleadoInfo(emp);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedEmpleadoId, empleadoInfo]);

  // Dashboard del empleado (objetivos/aptitudes del año)
  useEffect(() => {
    (async () => {
      if (!selectedEmpleadoId) {
        setDashEmpleadoData(null);
        return;
      }
      try {
        setLoadingDash(true);
        const res = await dashEmpleado(selectedEmpleadoId, anio);
        if (!res) {
          setDashEmpleadoData(null);
          return;
        }
        const normalized = { ...res };
        if (
          normalized.objetivos?.items &&
          !Array.isArray(normalized.objetivos)
        ) {
          normalized.objetivos = normalized.objetivos.items;
        }
        if (
          normalized.aptitudes?.items &&
          !Array.isArray(normalized.aptitudes)
        ) {
          normalized.aptitudes = normalized.aptitudes.items;
        }
        setDashEmpleadoData(normalized);
      } catch (e) {
        console.error("dashEmpleado error:", e);
        setDashEmpleadoData(null);
      } finally {
        setLoadingDash(false);
      }
    })();
  }, [selectedEmpleadoId, anio]);

  // Cuando llega el dashboard y no hay itemSeleccionado, tomar el primero / el del state
  useEffect(() => {
    if (!dashEmpleadoData || itemSeleccionado) return;

    const objetivos = Array.isArray(dashEmpleadoData.objetivos)
      ? dashEmpleadoData.objetivos
      : [];
    const aptitudes = Array.isArray(dashEmpleadoData.aptitudes)
      ? dashEmpleadoData.aptitudes
      : [];

    const primerObjetivo = objetivos[0] || null;
    const primerAptitud = aptitudes[0] || null;
    const base =
      state?.itemSeleccionado || primerObjetivo || primerAptitud || null;

    if (base) {
      const nuevoItem = {
        ...base,
        _tipo: base._tipo || (objetivos.includes(base) ? "objetivo" : "aptitud"),
      };

      setItemSeleccionado(nuevoItem);

      const hitos = Array.isArray(base.hitos) ? base.hitos : [];
      const p =
        periodoActivo ||
        state?.hito?.periodo ||
        periodo ||
        (hitos[0]?.periodo ?? null);

      if (selectedEmpleadoId && p) {
        loadEvaluacion(selectedEmpleadoId, nuevoItem, p);
      } else {
        setPeriodoActivo(p || null);
        resetToBlank(nuevoItem, p || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashEmpleadoData, itemSeleccionado]);

  // Si cambia itemSeleccionado o periodoActivo, recargar evaluación (cuando corresponde)
  useEffect(() => {
    if (!selectedEmpleadoId || !itemSeleccionado) return;

    const hitos = Array.isArray(itemSeleccionado.hitos)
      ? itemSeleccionado.hitos
      : [];
    const periodoDefault =
      periodoActivo ||
      state?.hito?.periodo ||
      periodo ||
      (hitos[0]?.periodo ?? null);

    if (!periodoDefault) return;

    loadEvaluacion(selectedEmpleadoId, itemSeleccionado, periodoDefault);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmpleadoId, itemSeleccionado?._id]);

  // Recalcula “actual” cuando hay metas (objetivos)
  useEffect(() => {
    if (!localHito) return;
    if (!isAptitud && localHito?.metas?.length) {
      const global = calcularResultadoGlobal(localHito.metas);
      setLocalHito((prev) => ({ ...prev, actual: global }));
    }
  }, [isAptitud, localHito?.metas]);

  /* ===================== Mapa de evaluaciones (lado izquierdo) ===================== */

  const mapaItems = useMemo(() => {
    if (!dashEmpleadoData) return [];

    const out = [];
    const pushItems = (arr, tipo) => {
      (arr || []).forEach((it) => {
        const hitos = Array.isArray(it.hitos) ? it.hitos : [];

        // En lugar de buscar el hito del periodoActivo, buscamos el más urgente
        let hitoMasUrgente = null;
        let bucketMasUrgente = "pendiente";
        const prioridades = { vencido: 1, por_vencer: 2, PENDING_EMPLOYEE: 3, PENDING_HR: 4, CLOSED: 5, pendiente: 6 };

        // Recolectamos todos los buckets presentes en este item
        const bucketsFound = new Set();
        const hitosByBucket = {}; // bucket -> hito (el primero o más urgente de ese bucket)

        hitos.forEach((h) => {
          const fechaRef = getFechaReferencia(it, h);
          const bucket = classifyBucket(fechaRef, h);
          bucketsFound.add(bucket);

          if (!hitosByBucket[bucket]) {
            hitosByBucket[bucket] = h;
          }

          const prioridadActual = prioridades[bucket] || 99;
          const prioridadMasUrgente = prioridades[bucketMasUrgente] || 99;

          if (prioridadActual < prioridadMasUrgente) {
            hitoMasUrgente = h;
            bucketMasUrgente = bucket;
          }
        });

        // Si no hay hitos, usar el primero o null
        if (!hitoMasUrgente && hitos.length) {
          hitoMasUrgente = hitos[0];
          const fechaRef = getFechaReferencia(it, hitoMasUrgente);
          bucketMasUrgente = classifyBucket(fechaRef, hitoMasUrgente);
          bucketsFound.add(bucketMasUrgente);
          hitosByBucket[bucketMasUrgente] = hitoMasUrgente;
        }

        out.push({
          _id: it._id,
          _tipo: tipo,
          nombre: it.nombre,
          descripcion: it.descripcion,
          peso: it.pesoBase ?? it.peso ?? null,
          progreso: Number(
            it.progreso ?? it.puntuacion ?? it.score ?? 0
          ),
          hitos,
          hitoActual: hitoMasUrgente,
          fechaRef: hitoMasUrgente ? getFechaReferencia(it, hitoMasUrgente) : null,
          bucket: bucketMasUrgente,
          buckets: Array.from(bucketsFound),
          hitosByBucket
        });
      });
    };

    pushItems(
      Array.isArray(dashEmpleadoData.objetivos)
        ? dashEmpleadoData.objetivos
        : [],
      "objetivo"
    );
    pushItems(
      Array.isArray(dashEmpleadoData.aptitudes)
        ? dashEmpleadoData.aptitudes
        : [],
      "aptitud"
    );

    return out;
  }, [dashEmpleadoData]);

  const itemsMapaFiltrados = useMemo(() => {
    let items = [...mapaItems];

    if (tipoMapaFiltro !== "todos") {
      items = items.filter((i) => i._tipo === tipoMapaFiltro);
    }

    if (bucketFiltro !== "todos") {
      // Filtrar si el item tiene ALGÚN hito con este bucket
      items = items.filter((i) => i.buckets.includes(bucketFiltro));

      // Ajustar la visualización para mostrar el hito correspondiente al filtro
      items = items.map(i => ({
        ...i,
        bucket: bucketFiltro, // Forzamos el bucket visual para que coincida con el filtro
        hitoActual: i.hitosByBucket[bucketFiltro] || i.hitoActual
      }));
    }

    const t = searchMapa.trim().toLowerCase();
    if (t) {
      items = items.filter(
        (i) =>
          (i.nombre || "").toLowerCase().includes(t) ||
          (i.descripcion || "").toLowerCase().includes(t)
      );
    }

    items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    return items;
  }, [mapaItems, tipoMapaFiltro, bucketFiltro, searchMapa]);

  /* ===================== Persistencia ===================== */

  const persistAndFlow = async (action) => {
    if (!itemSeleccionado || !localHito) return;

    if (!selectedEmpleadoId) {
      toast.error("Seleccioná un empleado.");
      return;
    }

    // Bloqueo por ventana temporal
    if (!editableTemporal) {
      toast.error(
        "Solo se pueden evaluar hitos por vencer (próximos 7 días) o vencidos."
      );
      return;
    }

    const periodoEval = periodoActivo || localHito.periodo;
    if (!periodoEval) {
      toast.error("Falta el período del hito a evaluar.");
      return;
    }

    const isApt = isAptitud;
    let actualToSend = 0;

    if (isApt) {
      const escalaNum = Number(localHito?.escala ?? 0);
      if (!escalaNum || escalaNum < 1 || escalaNum > 5) {
        toast.error("Seleccioná una escala (1 a 5) antes de enviar.");
        return;
      }
      actualToSend = Number((escalaNum * 20).toFixed(1));
    } else {
      const raw = calcularResultadoGlobal(localHito.metas ?? []);
      actualToSend = Number.isFinite(raw) ? Number(raw.toFixed(1)) : 0;
    }

    setLocalHito((prev) => ({ ...prev, actual: actualToSend }));

    try {
      setSaving(true);

      const body = {
        empleado: selectedEmpleadoId,
        plantillaId: itemSeleccionado._id,
        year: Number(String(periodoEval || "").slice(0, 4)),
        periodo: periodoEval,
        actual: actualToSend,
        comentario: localHito.comentario ?? "",
        comentarioManager: comentarioManager ?? "",
        ...(isApt
          ? { escala: Number(localHito?.escala ?? 0), metasResultados: [] }
          : {
            metasResultados: Array.isArray(localHito.metas)
              ? dedupeMetas(localHito.metas)
              : [],
          }),
        estado: "MANAGER_DRAFT",
      };

      // upsert simple
      await api("/evaluaciones", { method: "POST", body });
      await api(
        `/evaluaciones/${selectedEmpleadoId}/${itemSeleccionado._id}/${periodoEval}`,
        { method: "PUT", body }
      );

      if (action === "toEmployee") {
        const evals = await api(
          `/evaluaciones?plantillaId=${itemSeleccionado._id}&periodo=${periodoEval}`
        );
        const target = (Array.isArray(evals) ? evals : evals?.items || []).find(
          (e) => String(e.empleado) === String(selectedEmpleadoId)
        );
        if (target) {
          if (target.estado !== "MANAGER_DRAFT") {
            await api(`/evaluaciones/${target._id}/reopen`, {
              method: "POST",
            });
          }
          await api(`/evaluaciones/${target._id}/submit-to-employee`, {
            method: "POST",
          });
        }
        toast.success("Enviado al empleado");
      } else if (action === "draft") {
        toast.success("Borrador guardado");
      }
    } catch (e) {
      console.error(e);
      const msg = e?.message || "Error procesando la evaluación";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ===================== Render helpers ===================== */

  const Chip = ({ children }) => (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-slate-200 bg-slate-50">
      {children}
    </span>
  );

  const resumenEmpleado = useMemo(
    () => buildResumenEmpleado(dashEmpleadoData),
    [dashEmpleadoData]
  );

  const empleadoNombreCompleto = useMemo(() => {
    const e = empleadoInfo;
    if (!e) return "Colaborador";
    return `${e.apellido || ""} ${e.nombre || ""}`.trim() || "Colaborador";
  }, [empleadoInfo]);

  const estadoLabel = useMemo(() => {
    const code = localHito?.estado || "MANAGER_DRAFT";
    if (code === "MANAGER_DRAFT") return "Borrador del jefe";
    const found = ESTADOS.find((s) => s.code === code);
    return found?.label || code;
  }, [localHito?.estado]);

  if (!puedeVer) {
    return (
      <div className="container-app p-6">
        <div className="max-w-3xl mx-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-6 text-center">
          <h2 className="text-lg font-semibold mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-600">
            No tenés permisos para ver esta evaluación.
          </p>
        </div>
      </div>
    );
  }

  /* ===================== Render principal ===================== */

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate("/seguimiento");
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50"
            >
              ← Volver
            </button>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Sala de evaluación
              </div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                {empleadoNombreCompleto}
                <span className="text-xs font-normal text-slate-500">
                  · Año {anio}
                </span>
              </h1>
              {itemSeleccionado && (
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  <Chip>{isAptitud ? "💡 Aptitud" : "🎯 Objetivo"}</Chip>
                  {periodoActivo && <Chip>Periodo: {periodoActivo}</Chip>}
                  <Chip>Estado: {estadoLabel}</Chip>
                  <Chip>{bucketCfg.chip}</Chip>
                </div>
              )}
            </div>
          </div>

          {resumenEmpleado && (
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="text-[11px] text-slate-500">
                Global referencial
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-700">
                  {Math.round(resumenEmpleado.global)}%
                </span>
                <span className="text-xs text-slate-500">año actual</span>
              </div>
              <div className="w-40">
                <ProgressBar value={resumenEmpleado.global} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRID principal */}
      <div className="max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-[350px_1fr_320px] gap-6">
        {/* IZQUIERDA: Sidebar (Ficha + Mapa) */}
        <div className="space-y-6 h-fit sticky top-24">
          {/* Ficha colaborador */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {fotoSrc(empleadoInfo) ? (
                <img
                  src={fotoSrc(empleadoInfo)}
                  alt={empleadoNombreCompleto}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-indigo-100"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center ring-2 ring-indigo-200">
                  <UserCircle2 className="h-8 w-8 text-indigo-500" />
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Colaborador
                </div>
                <div className="text-sm font-semibold">
                  {empleadoNombreCompleto}
                </div>
                <div className="text-[11px] text-slate-500">
                  {empleadoInfo?.puesto || "Sin puesto definido"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-1">
              <div className="rounded-lg bg-slate-50 border px-3 py-2">
                <div className="text-[10px] uppercase text-slate-400">Área</div>
                <div className="font-medium text-xs">
                  {empleadoInfo?.area?.nombre || "—"}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 border px-3 py-2">
                <div className="text-[10px] uppercase text-slate-400">
                  Sector
                </div>
                <div className="font-medium text-xs">
                  {empleadoInfo?.sector?.nombre || "—"}
                </div>
              </div>
              {empleadoInfo?.legajo && (
                <div className="rounded-lg bg-slate-50 border px-3 py-2">
                  <div className="text-[10px] uppercase text-slate-400">
                    Legajo
                  </div>
                  <div className="font-medium text-xs">
                    {empleadoInfo.legajo}
                  </div>
                </div>
              )}
              {empleadoInfo?.email && (
                <div className="rounded-lg bg-slate-50 border px-3 py-2">
                  <div className="text-[10px] uppercase text-slate-400">
                    Email
                  </div>
                  <div className="font-medium text-[11px] truncate">
                    {empleadoInfo.email}
                  </div>
                </div>
              )}
            </div>

            {resumenEmpleado && (
              <div className="mt-2 rounded-xl border bg-slate-50 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Resultado global (referencial)
                  </span>
                  <span className="text-sm font-semibold">
                    {Math.round(resumenEmpleado.global)}%
                  </span>
                </div>
                <ProgressBar value={resumenEmpleado.global} />

                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div>
                    <div className="text-slate-500 mb-0.5">
                      🎯 Objetivos ({resumenEmpleado.objetivos.cantidad})
                    </div>
                    <div className="font-semibold">
                      {Math.round(resumenEmpleado.objetivos.score)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">
                      💡 Aptitudes ({resumenEmpleado.aptitudes.cantidad})
                    </div>
                    <div className="font-semibold">
                      {Math.round(resumenEmpleado.aptitudes.score)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mapa de evaluaciones (Movido al sidebar) */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col max-h-[60vh]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold">Mapa de evaluaciones</h3>
                <p className="text-[11px] text-slate-500">
                  Objetivos y aptitudes del año.
                </p>
              </div>
              {loadingDash && (
                <span className="text-[11px] text-slate-500">Cargando…</span>
              )}
            </div>

                       {/* Filtros */}
            <div className="flex flex-col gap-3 mb-3">
              {/* Filtro por tipo */}
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-1">
                  Filtrar por tipo
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { k: "todos", lbl: "Todos" },
                    { k: "objetivo", lbl: "Objetivos" },
                    { k: "aptitud", lbl: "Aptitudes" },
                  ].map((b) => (
                    <button
                      key={b.k}
                      className={`px-2 py-1 rounded-md text-[11px] border ${
                        tipoMapaFiltro === b.k
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      onClick={() => setTipoMapaFiltro(b.k)}
                    >
                      {b.lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por estado */}
              <div>
                <p className="text-[11px] font-medium text-slate-500 mb-1">
                  Filtrar por estado
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { k: "todos", lbl: "Todos" },
                    { k: "por_vencer", lbl: "Por vencer" },
                    { k: "vencido", lbl: "Vencidos" },
                    { k: "pendiente", lbl: "Pendientes" },
                    { k: "PENDING_EMPLOYEE", lbl: "Enviados" },
                    { k: "PENDING_HR", lbl: "En RRHH" },
                    { k: "CLOSED", lbl: "Cerrados" },
                  ].map((b) => (
                    <button
                      key={b.k}
                      className={`px-2 py-1 rounded-md text-[11px] border ${
                        bucketFiltro === b.k
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      onClick={() => setBucketFiltro(b.k)}
                    >
                      {b.lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>


            {/* Lista con scroll limitado */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {itemsMapaFiltrados.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay elementos.
                </p>
              )}

              {itemsMapaFiltrados.map((it) => {
                const selected =
                  itemSeleccionado &&
                  String(itemSeleccionado._id) === String(it._id);
                const cfg = bucketConfig(it.bucket);
                const progreso = Math.round(it.progreso || 0);

                const handleClick = () => {
                  const nuevoItem = {
                    ...it,
                    _tipo: it._tipo,
                  };
                  setItemSeleccionado(nuevoItem);

                  const hitos = Array.isArray(it.hitos) ? it.hitos : [];
                  const defaultPeriodo =
                    it.hitoActual?.periodo ||
                    hitos[0]?.periodo ||
                    periodoActivo ||
                    periodo;

                  if (defaultPeriodo) {
                    setPeriodoActivo(defaultPeriodo);
                    if (selectedEmpleadoId) {
                      loadEvaluacion(
                        selectedEmpleadoId,
                        nuevoItem,
                        defaultPeriodo
                      );
                    }
                  } else {
                    setPeriodoActivo(null);
                    resetToBlank(nuevoItem, null);
                  }
                };

                return (
                  <button
                    key={it._id}
                    onClick={handleClick}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs transition shadow-sm ${selected
                      ? "bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200"
                      : "bg-slate-50 hover:bg-white"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 w-full">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">
                            {it._tipo === "objetivo" ? "Objetivo" : "Aptitud"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full ring-1 ${cfg.badgeClass}`}
                          >
                            {cfg.chip}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 text-[13px] line-clamp-2 leading-snug">
                          {it.nombre}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar value={progreso} />
                          </div>
                          <span className="text-[11px] text-slate-600 min-w-[30px] text-right font-medium">
                            {progreso}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTRO: Evaluación actual */}
        <div className="space-y-4">
          {/* Detalle del ítem y período */}
          {itemSeleccionado && (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
                    Ítem a evaluar
                  </div>
                  <h2 className="text-base font-semibold leading-snug">
                    {itemSeleccionado?.nombre}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {itemSeleccionado?.descripcion || "Sin descripción"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {(itemSeleccionado?.pesoBase != null ||
                      itemSeleccionado?.peso != null) && (
                        <div className="rounded-lg bg-slate-50 border px-3 py-2">
                          <div className="text-[10px] text-slate-500">Peso</div>
                          <div className="text-sm font-semibold">
                            {itemSeleccionado?.pesoBase ??
                              itemSeleccionado?.peso}
                            %
                          </div>
                        </div>
                      )}
                    <div className="rounded-lg bg-slate-50 border px-3 py-2">
                      <div className="text-[10px] text-slate-500">Estado</div>
                      <div className="text-xs font-medium">{estadoLabel}</div>
                    </div>
                  </div>

                  {/* Selector de período */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Período</span>
                    <select
                      className="text-xs rounded-md border px-2 py-1 bg-slate-50"
                      value={periodoActivo || ""}
                      onChange={(e) => {
                        const nuevoPeriodo = e.target.value || null;
                        setPeriodoActivo(nuevoPeriodo);
                        if (nuevoPeriodo && selectedEmpleadoId) {
                          loadEvaluacion(
                            selectedEmpleadoId,
                            itemSeleccionado,
                            nuevoPeriodo
                          );
                        } else if (itemSeleccionado) {
                          resetToBlank(itemSeleccionado, nuevoPeriodo);
                        }
                      }}
                    >
                      {(itemSeleccionado?.hitos || []).map((h, idx) => (
                        <option key={`${h.periodo}-${idx}`} value={h.periodo}>
                          {h.periodo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              📝 Comentarios
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Comentario del período (historial interno)
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm mt-1"
                  value={localHito?.comentario ?? ""}
                  disabled={!editable}
                  onChange={(e) =>
                    setLocalHito((p) => ({
                      ...(p || {}),
                      comentario: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Comentario del manager (visible para el colaborador)
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm mt-1"
                  placeholder="Este comentario se verá al enviar al empleado / RRHH"
                  value={comentarioManager ?? ""}
                  onChange={(e) => setComentarioManager(e.target.value)}
                  disabled={!editable}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Evaluación del hito: metas / escala */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">📌 Evaluación del hito</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-500">
                  Resultado global
                </span>
                <span className="text-lg font-semibold text-indigo-700">
                  {localHito?.actual != null
                    ? `${Number(localHito.actual).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            </div>

            {isAptitud ? (
              <div className="grid gap-3">
                <div className="border rounded-md p-3 bg-slate-50 shadow-sm">
                  <label className="text-xs text-muted-foreground">
                    Escala de evaluación
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-2 text-sm bg-white"
                    disabled={!editable}
                    value={localHito?.escala ?? ""}
                    onChange={(e) =>
                      setLocalHito((prev) => ({
                        ...(prev || {}),
                        escala: Number(e.target.value || 0),
                        actual: scaleToPercent(Number(e.target.value || 0)),
                      }))
                    }
                  >
                    <option value="">Seleccionar…</option>
                    <option value={1}>
                      1 - Insatisfactorio / No cumple
                    </option>
                    <option value={2}>
                      2 - Necesita mejorar / A veces cumple
                    </option>
                    <option value={3}>
                      3 - Cumple con las expectativas
                    </option>
                    <option value={4}>
                      4 - Supera las expectativas
                    </option>
                    <option value={5}>5 - Sobresaliente</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resultado global:{" "}
                    <b>
                      {localHito?.escala
                        ? `${scaleToPercent(localHito.escala)}%`
                        : "—"}
                    </b>
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {dedupeMetas(localHito?.metas || []).map((m, idx) => (
                  <div
                    key={`${m._id ?? m.nombre}-${idx}`}
                    className="border rounded-md p-3 bg-slate-50 shadow-sm"
                  >
                    <p className="text-sm font-semibold">{m.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Esperado: {m.operador || ">="} {m.esperado} {m.unidad}
                    </p>

                    {m.unidad === "Cumple/No Cumple" ? (
                      <label className="flex items-center gap-2 mt-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!m.resultado}
                          disabled={!editable}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setLocalHito((prev) => {
                              const metas = dedupeMetas([
                                ...(prev?.metas || []),
                              ]);
                              metas[idx] = {
                                ...metas[idx],
                                resultado: val,
                                cumple: val,
                              };
                              return { ...(prev || {}), metas };
                            });
                          }}
                        />
                        Cumplido
                      </label>
                    ) : (
                      <>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1 text-sm mt-2 focus:ring-2 focus:ring-primary/40 outline-none bg-white"
                          placeholder="Resultado alcanzado"
                          value={m.resultado ?? ""}
                          disabled={!editable}
                          onChange={(e) => {
                            const valor =
                              e.target.value === ""
                                ? null
                                : Number(e.target.value);
                            setLocalHito((prev) => {
                              const metas = dedupeMetas([
                                ...(prev?.metas || []),
                              ]);
                              metas[idx] = {
                                ...metas[idx],
                                resultado: valor,
                                cumple: evaluarCumple(
                                  valor,
                                  metas[idx].esperado,
                                  metas[idx].operador,
                                  metas[idx].unidad
                                ),
                              };
                              return { ...(prev || {}), metas };
                            });
                          }}
                        />
                        {m.resultado !== null &&
                          m.resultado !== undefined && (
                            <p
                              className={`text-xs mt-1 font-medium ${evaluarCumple(
                                m.resultado,
                                m.esperado,
                                m.operador,
                                m.unidad
                              )
                                ? "text-green-600"
                                : "text-red-600"
                                }`}
                            >
                              {evaluarCumple(
                                m.resultado,
                                m.esperado,
                                m.operador,
                                m.unidad
                              )
                                ? "✔ Cumplido"
                                : "✘ No cumplido"}
                            </p>
                          )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-[11px] text-slate-500">
                Recordá: podés guardar borrador y volver luego a esta evaluación
                desde el Gantt.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => persistAndFlow("draft")}
                  disabled={saving || !editableTemporal}
                >
                  Guardar borrador
                </Button>

                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button disabled={saving || !editableTemporal}>
                      Enviar al empleado
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:max-w-md sm:rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Confirmás el envío?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Una vez enviado, el empleado podrá ver la evaluación y
                        continuar con su parte del flujo. No podrás modificar
                        las metas ni los valores. ¿Querés continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setConfirmOpen(false);
                          persistAndFlow("toEmployee");
                        }}
                      >
                        Sí, enviar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        {/* DERECHA: Trazabilidad */}
        <div className="space-y-6 h-fit sticky top-24">
          {itemSeleccionado && (
            <TraceabilityCard
              objetivo={itemSeleccionado}
              trazabilidad={[
                {
                  estado: localHito?.estado?.toLowerCase() || "borrador",
                  fecha: localHito?.fecha,
                  usuario: "Jefe",
                },
                ...(localHito?.comentario
                  ? [
                    {
                      estado: "feedback",
                      fecha: new Date(),
                      comentario: localHito.comentario,
                    },
                  ]
                  : []),
              ]}
              resultadoGlobal={localHito?.actual}
            />
          )}
        </div>
      </div>
    </div>
  );
}
