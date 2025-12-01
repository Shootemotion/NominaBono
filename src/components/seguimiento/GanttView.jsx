import { useMemo, useState } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const STATUS_CONFIG = {
  vencido: {
    id: "vencido",
    label: "Vencido",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    pill: "bg-rose-500",
    order: 1,
  },
  por_vencer: {
    id: "por_vencer",
    label: "Por Vencer",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    pill: "bg-amber-500",
    order: 2,
  },
  PENDING_EMPLOYEE: {
    id: "PENDING_EMPLOYEE",
    label: "Enviado al Empleado",
    color: "text-cyan-700 bg-cyan-50 border-cyan-200",
    pill: "bg-cyan-500",
    order: 3,
  },
  PENDING_HR: {
    id: "PENDING_HR",
    label: "En RRHH",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    pill: "bg-blue-500",
    order: 4,
  },
  CLOSED: {
    id: "CLOSED",
    label: "Cerrado",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    pill: "bg-emerald-500",
    order: 5,
  },
  pendiente: {
    id: "pendiente",
    label: "Pendiente",
    color: "text-slate-600 bg-slate-50 border-slate-200",
    pill: "bg-slate-400",
    order: 6,
  },
};

function parsePeriodoToDate(periodoStr) {
  if (!periodoStr) return null;
  const mMatch = periodoStr.match(/^(\d{4})M(\d{1,2})$/i);
  if (mMatch) return new Date(Number(mMatch[1]), Number(mMatch[2]) - 1, 28);
  const qMatch = periodoStr.match(/^(\d{4})Q([1-4])$/i);
  if (qMatch) return new Date(Number(qMatch[1]), (Number(qMatch[2]) - 1) * 3 + 2, 28);
  const yMatch = periodoStr.match(/^(\d{4})$/);
  if (yMatch) return new Date(Number(yMatch[1]), 11, 31);
  const d = new Date(periodoStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getHybridStatus(sourceData, fechaRef) {
  const dbStatus = sourceData?.estado;
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

function buildColumns(anio) {
  const cols = [];
  const startMonth = 9; // Septiembre
  for (let i = 0; i < 12; i++) {
    let m = startMonth + i;
    let y = anio;
    if (m > 12) {
      m -= 12;
      y = anio + 1;
    }
    const mStr = String(m).padStart(2, "0");
    const label = new Date(y, m - 1, 1).toLocaleString("es-ES", { month: "short" });
    cols.push({ key: `${y}M${mStr}`, label: `${label} ${y}`, mes: m, year: y });
  }
  return cols;
}

export default function GanttView({
  grouped = [],
  anio,
  openHitoModal,
  dueOnly,
  selectedEmpleadoId,
}) {
  const currentYear = anio || new Date().getFullYear();
  const columns = useMemo(() => buildColumns(currentYear), [currentYear]);

  const processedRows = useMemo(() => {
    const groupsMap = new Map();
    const seenIds = new Set();

    grouped.forEach((item) => {
      let itemEmployees = [];
      if (Array.isArray(item.empleados)) itemEmployees = item.empleados;
      else if (item.empleado) itemEmployees = [item.empleado];

      itemEmployees.forEach((emp) => {
               if (!emp || !emp._id) return;
        if (selectedEmpleadoId && String(emp._id) !== String(selectedEmpleadoId)) return;

        const areaName = emp.area?.nombre || "Sin Área";
        const sectorName = emp.sector?.nombre || "Sin Sector";

        (item.hitos || []).forEach((hito) => {
          const uniqueKey = `${item._id}-${emp._id}-${hito.periodo}`;
          if (seenIds.has(uniqueKey)) return;
          seenIds.add(uniqueKey);

          const fechaRef = hito.fecha
            ? new Date(hito.fecha)
            : parsePeriodoToDate(hito.periodo);
          const statusKey = getHybridStatus(hito, fechaRef);

          if (dueOnly && statusKey !== "vencido" && statusKey !== "por_vencer") return;

          const groupKey = `${areaName}||${sectorName}||${statusKey}`;

          if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, {
              id: groupKey,
              area: areaName,
              sector: sectorName,
              statusKey: statusKey,
              itemsByPeriod: {},
            });
          }

          const group = groupsMap.get(groupKey);

          let periodKey = hito.periodo;
          if (hito.fecha) {
            const d = new Date(hito.fecha);
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth() + 1;
            periodKey = `${y}M${String(m).padStart(2, "0")}`;
          }

          if (!group.itemsByPeriod[periodKey]) group.itemsByPeriod[periodKey] = [];
          group.itemsByPeriod[periodKey].push({
            empleado: emp,
            item: item,
            hito: hito,
            statusKey: statusKey,
          });
        });
      });
    });

    let rows = Array.from(groupsMap.values());
    rows.sort((a, b) => {
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
      const orderA = STATUS_CONFIG[a.statusKey]?.order || 99;
      const orderB = STATUS_CONFIG[b.statusKey]?.order || 99;
      return orderA - orderB;
    });

    return rows;
  }, [grouped, selectedEmpleadoId, dueOnly]);

  const [hoverData, setHoverData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e, data) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHoverData(data);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white text-xs">
      {/* Scroll único (horizontal + vertical) */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pb-20">
        <div className="min-w-full">
          {/* HEADER sticky */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
            <div className="w-40 shrink-0 px-3 py-3 font-bold text-slate-600">
              Área
            </div>
            <div className="w-40 shrink-0 px-3 py-3 font-bold text-slate-600 border-l border-slate-200">
              Sector
            </div>
            <div className="w-32 shrink-0 px-3 py-3 font-bold text-slate-600 border-l border-slate-200">
              Estado
            </div>

            {/* Bloque de meses: ancho = 12 * 120px */}
            <div className="flex">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="w-[120px] flex-none border-l border-slate-200 px-1 py-3 text-center font-medium text-slate-500 uppercase text-[10px] bg-slate-50"
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* CUERPO */}
          {processedRows.length === 0 && (
            <div className="p-10 text-center text-slate-400 italic">
              No hay datos para mostrar con los filtros actuales.
            </div>
          )}

          {processedRows.map((row) => {
            const statusConfig =
              STATUS_CONFIG[row.statusKey] || STATUS_CONFIG.pendiente;

            let maxItemsInCell = 0;
            Object.values(row.itemsByPeriod).forEach((arr) => {
              const uniqueEmps = new Set(arr.map((x) => x.empleado._id));
              maxItemsInCell = Math.max(maxItemsInCell, uniqueEmps.size);
            });
            const rowHeight = Math.max(50, maxItemsInCell * 24 + 16);

            return (
              <div
                key={row.id}
                className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                style={{ minHeight: rowHeight }}
              >
                <div className="w-40 shrink-0 px-3 py-2 flex items-center border-r border-slate-100 text-slate-600 font-medium truncate">
                  <span className="truncate" title={row.area}>
                    {row.area}
                  </span>
                </div>
                <div className="w-40 shrink-0 px-3 py-2 flex items-center border-r border-slate-100 text-slate-500 truncate">
                  <span className="truncate" title={row.sector}>
                    {row.sector}
                  </span>
                </div>
                <div className="w-32 shrink-0 px-3 py-2 flex items-center border-r border-slate-100">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-semibold border ${statusConfig.color} w-full text-center truncate shadow-sm`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Bloque de meses de la fila: misma estructura que el header */}
                <div className="flex h-full">
                  {columns.map((col) => {
                    const rawItems = row.itemsByPeriod[col.key] || [];
                    const empsInCell = new Map();
                    rawItems.forEach((ri) => {
                      if (!empsInCell.has(ri.empleado._id)) {
                        empsInCell.set(ri.empleado._id, {
                          empleado: ri.empleado,
                          items: [],
                        });
                      }
                      empsInCell.get(ri.empleado._id).items.push(ri);
                    });
                    const cellEmployees = Array.from(empsInCell.values());

                    return (
                      <div
                        key={col.key}
                        className="w-[120px] flex-none border-l border-slate-100 p-1 flex flex-col gap-1"
                      >
                        {cellEmployees.map((cellEmp, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-1.5 py-1 rounded border shadow-sm cursor-pointer bg-white hover:bg-slate-50 transition-all ${statusConfig.color}`}
                            onClick={() => {
                              if (openHitoModal && cellEmp.items[0]) {
                                const first = cellEmp.items[0];
                                openHitoModal(
                                  first.item,
                                  [cellEmp.empleado],
                                  first.hito
                                );
                              }
                            }}
                            onMouseEnter={(e) =>
                              handleMouseEnter(e, {
                                ...cellEmp,
                                statusKey: row.statusKey,
                              })
                            }
                            onMouseLeave={() => setHoverData(null)}
                          >
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ${statusConfig.pill}`}
                            >
                              {cellEmp.empleado.nombre?.charAt(0)}
                              {cellEmp.empleado.apellido?.charAt(0)}
                            </div>
                            <span className="truncate font-medium text-[10px]">
                              {cellEmp.empleado.nombre}{" "}
                              {cellEmp.empleado.apellido}
                            </span>
                            {cellEmp.items.length > 1 && (
                              <span className="text-[9px] opacity-70 ml-auto">
                                ({cellEmp.items.length})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hoverData && (
        <div
          className="fixed z-50 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 text-xs pointer-events-none"
          style={{
            top: tooltipPos.y - 10,
            left: tooltipPos.x,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-bold text-slate-700 mb-1 border-b border-slate-100 pb-1 flex justify-between">
            <span>
              {hoverData.empleado.nombre} {hoverData.empleado.apellido}
            </span>
          </div>
          <div className="space-y-1 mt-2">
            {hoverData.items.map((it, i) => (
              <div key={i} className="flex items-start gap-1 text-slate-500">
                <span className="mt-1 text-[6px]">●</span>
                <span>{it.item.nombre}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center italic">
            Click para ver detalles
          </div>
        </div>
      )}
    </div>
  );
}
