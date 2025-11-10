// src/pages/SeguimientoReferente.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { dashArea, dashSector } from "@/lib/dashboard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

import FilterBar from "@/components/seguimiento/FilterBar";
import GanttView from "@/components/seguimiento/GanttView";
import CalendarView from "@/components/seguimiento/CalendarView";
import EvalModal from "@/components/seguimiento/EvalModal";
import { Button } from "@/components/ui/button";

export default function SeguimientoReferente() {
  const { user } = useAuth();

  // ====== Roles ======
  const esReferente = Boolean(
    (Array.isArray(user?.referenteAreas) && user.referenteAreas.length > 0) ||
    (Array.isArray(user?.referenteSectors) && user.referenteSectors.length > 0)
  );
  const esDirector = user?.rol === "directivo" || user?.isRRHH === true;
  const esSuperAdmin = user?.rol === "superadmin";
  const esVisor = user?.rol === "visor"; // 🚩 nuevo caso: usuario común/visor
const navigate = useNavigate();
  // Quienes pueden ver algo de la página
  const puedeVer = esReferente || esDirector || esSuperAdmin || esVisor;

  // ====== Estados ======
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [sectorFiltro, setSectorFiltro] = useState("todos");
  const [empQuery, setEmpQuery] = useState("");
  const [empSelectedId, setEmpSelectedId] = useState(null);
  const [showEmpHints, setShowEmpHints] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [view, setView] = useState("gantt");
  const [zoom, setZoom] = useState("mes");



  // ====== Carga inicial de data ======
  useEffect(() => {
    if (!puedeVer) return;

    (async () => {
      try {
        setLoading(true);
        let data = [];

        if (esReferente) {
          // 🚩 Caso REFERENTE: solo sus áreas o sectores
          if (user?.referenteAreas?.length) {
            const results = await Promise.all(
              user.referenteAreas.map((a) => dashArea(a, anio))
            );
            data = results.flat();
          } else if (user?.referenteSectors?.length) {
            const results = await Promise.all(
              user.referenteSectors.map((s) => dashSector(s, anio))
            );
            data = results.flat();
          }

        } else if (esDirector) {
          // 🚩 Caso DIRECTOR/RRHH: ve todo (todas las áreas y sectores)
          const [allAreas, allSectores] = await Promise.all([
            dashArea(null, anio),   // null = sin filtro
            dashSector(null, anio), // null = sin filtro
          ]);
          data = [...allAreas, ...allSectores];

        } else if (esVisor && user?.empleado?._id) {
          // 🚩 Caso VISOR: solo sus propios objetivos
          const resp = await api(`/dashboard/empleado/${user.empleado._id}?year=${anio}`);
          data = Array.isArray(resp) ? resp : [resp];
        }

        setRows(data || []);
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar empleados para seguimiento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, anio, puedeVer, esReferente, esDirector, esVisor]);

  // ====== Bloque de acceso restringido ======
  if (!puedeVer) {
    return (
      <div className="container-app p-6">
        <div className="max-w-3xl mx-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-6 text-center">
          <h2 className="text-lg font-semibold mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-600">
            Necesitás ser referente, directivo/RRHH o tener un usuario activo con objetivos propios.
          </p>
        </div>
      </div>
    );
  }

  // ====== Filtros derivados ======
  const areasUnicas = useMemo(() => {
    const s = new Map();
    rows.forEach((r) => {
      const a = r.empleado?.area;
      if (!a) return;
      const id = String(a?._id || a);
      const nombre = a?.nombre || a?.name || "Sin nombre";
      s.set(id, { _id: id, nombre });
    });
    return [{ _id: "todas", nombre: "Todas" }, ...Array.from(s.values())];
  }, [rows]);

  const sectoresUnicos = useMemo(() => {
    const s = new Map();
    rows.forEach((r) => {
      const sec = r.empleado?.sector;
      if (!sec) return;
      const id = String(sec?._id || sec);
      const nombre = sec?.nombre || sec?.name || "Sin nombre";
      s.set(id, { _id: id, nombre });
    });
    return [{ _id: "todos", nombre: "Todos" }, ...Array.from(s.values())];
  }, [rows]);

  const empHints = useMemo(() => {
    const t = empQuery.trim().toLowerCase();
    if (!t) return [];
    const mapa = new Map();
    rows.forEach((r) => {
      const e = r.empleado;
      if (!e) return;
      const id = String(e._id);
      const label = `${e.apellido || ""} ${e.nombre || ""}`.trim();
      const sec = (e.sector?.nombre || "").toLowerCase();
      const ar = (e.area?.nombre || "").toLowerCase();
      if (label.toLowerCase().includes(t) || sec.includes(t) || ar.includes(t)) {
        if (!mapa.has(id))
          mapa.set(id, {
            _id: id,
            label,
            sector: e.sector?.nombre || "—",
            area: e.area?.nombre || "—",
          });
      }
    });
    return Array.from(mapa.values()).slice(0, 8);
  }, [rows, empQuery]);

  const filtered = useMemo(() => {
    let data = rows;
    if (areaFiltro !== "todas") {
      data = data.filter(
        (r) =>
          String(r.empleado?.area?._id || r.empleado?.area) === String(areaFiltro)
      );
    }
    if (sectorFiltro !== "todos") {
      data = data.filter(
        (r) =>
          String(r.empleado?.sector?._id || r.empleado?.sector) ===
          String(sectorFiltro)
      );
    }
    if (empSelectedId) {
      data = data.filter((r) => String(r.empleado?._id) === String(empSelectedId));
    }
    return data;
  }, [rows, areaFiltro, sectorFiltro, empSelectedId]);

  // ====== Agenda (vista calendario) ======
  const agendaList = useMemo(() => {
    if (view !== "agenda") return [];
    const entries = [];
    filtered.forEach((r) => {
      const emp = r.empleado;
      if (!emp) return;
      const items = [
        ...(tipoFiltro !== "aptitud"
          ? r.objetivos.items.map((i) => ({
              ...i,
              _tipo: "objetivo",
              empleados: [emp],
            }))
          : []),
        ...(tipoFiltro !== "objetivo"
          ? r.aptitudes.items.map((i) => ({
              ...i,
              _tipo: "aptitud",
              empleados: [emp],
            }))
          : []),
      ];
      items.forEach((it, idx) => {
        (it.hitos || []).forEach((h, j) => {
          const key = `${emp._id}-${it._id}-${h.periodo}-${idx}-${j}`;
          entries.push({
            key,
            empleados: [emp],
            item: it,
            periodo: h.periodo,
            fecha: h.fecha,
          });
        });
      });
    });
    return entries.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [filtered, tipoFiltro, view]);

 const openHitoPage = (item, empleados, hito) => {
    // Navegación con “state” para evitar refetch innecesario; la página tiene fallback a fetch.
    const empId = empleados?.[0]?._id ?? null;
    navigate(`/evaluacion/${item._id}/${hito.periodo}/${empId ?? ""}`, {
      state: {
        from: "seguimiento",
        anio,
        itemSeleccionado: item,
        empleadosDelItem: empleados || [],
        hito,
      },
      replace: false,
    });
  };


  // ====== Render ======
  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="max-w-7xl mx-auto space-y-6 px-4">
        {/* filtros */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <FilterBar
            {...{
              anio,
              setAnio,
              areaFiltro,
              setAreaFiltro,
              areasUnicas,
              sectorFiltro,
              setSectorFiltro,
              sectoresUnicos,
              empQuery,
              setEmpQuery,
              empSelectedId,
              setEmpSelectedId,
              empHints,
              showEmpHints,
              setShowEmpHints,
            }}
          />
        </div>

        {/* controles */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              variant={view === "gantt" ? "default" : "outline"}
              onClick={() => setView("gantt")}
            >
              📊 Gantt
            </Button>
            <Button
              variant={view === "agenda" ? "default" : "outline"}
              onClick={() => setView("agenda")}
            >
              📅 Calendario
            </Button>
          </div>

          {/* filtro tipo */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tipo</span>
            <div className="inline-flex gap-1">
              <Button
                variant={tipoFiltro === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setTipoFiltro("todos")}
              >
                Todos
              </Button>
              <Button
                variant={tipoFiltro === "objetivo" ? "default" : "outline"}
                size="sm"
                onClick={() => setTipoFiltro("objetivo")}
              >
                🎯 Objetivos
              </Button>
              <Button
                variant={tipoFiltro === "aptitud" ? "default" : "outline"}
                size="sm"
                onClick={() => setTipoFiltro("aptitud")}
              >
                💡 Aptitudes
              </Button>
            </div>
          </div>

          {view === "gantt" && (
            <div className="flex gap-2">
              <Button
                variant={zoom === "mes" ? "default" : "outline"}
                size="sm"
                onClick={() => setZoom("mes")}
              >
                Meses
              </Button>
              <Button
                variant={zoom === "trimestre" ? "default" : "outline"}
                size="sm"
                onClick={() => setZoom("trimestre")}
              >
                Trimestres
              </Button>
            </div>
          )}
        </div>

        {/* contenido */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {view === "agenda" ? (
             <CalendarView agendaList={agendaList} openHitoModal={openHitoPage} />
          ) : (
            <GanttView
              filtered={filtered}
              tipoFiltro={tipoFiltro}
              anio={anio}
              zoom={zoom}
               openHitoModal={openHitoPage}
            />
          )}
        </div>

        {/* modal */}
   
      </div>
    </div>
  );
}
