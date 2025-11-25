import { useState } from "react";
import { Button } from "@/components/ui/button";

// misma lógica de fechas que el Gantt
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

export default function CalendarView({ agendaList, openHitoModal }) {
  const today = new Date();
  const [offset, setOffset] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null);

  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();

  const firstDay = new Date(year, month, 1);
  const startWeekDay = (firstDay.getDay() + 6) % 7; // Lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // usar fecha explícita o derivada del periodo
  const byDay = agendaList.reduce((acc, e) => {
    const fechaRef = e.fecha ? new Date(e.fecha) : parsePeriodoToDate(e.periodo);
    if (!fechaRef || Number.isNaN(fechaRef.getTime())) return acc;

    if (fechaRef.getFullYear() === year && fechaRef.getMonth() === month) {
      const d = fechaRef.getDate();
      (acc[d] ||= []).push(e);
    }
    return acc;
  }, {});

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)}>◀</Button>
        <h3 className="text-base font-semibold">
          {base.toLocaleString("es-AR", { month: "long", year: "numeric" })}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setOffset((o) => o + 1)}>▶</Button>
      </div>

      {/* Días semana */}
      <div className="grid grid-cols-7 text-xs text-slate-500 mb-1 px-1">
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
          <div key={d} className="py-1 text-center">{d}</div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cellDate, i) => {
          if (!cellDate) {
            return (
              <div
                key={i}
                className="h-28 rounded-lg border border-slate-100 bg-slate-100"
              />
            );
          }

          const day = cellDate.getDate();
          const events = byDay[day] || [];
          const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
          const isExpanded = expandedDay?.toDateString() === cellDate.toDateString();

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          // 🔹 Agrupar por empleado, igual que el Gantt
          const byEmpleado = new Map();
          events.forEach((ev) => {
            const emp = ev.empleado;
            if (!emp || !emp._id) return;
            const id = String(emp._id);
            if (!byEmpleado.has(id)) {
              byEmpleado.set(id, { empleado: emp, entries: [] });
            }
            byEmpleado.get(id).entries.push(ev);
          });
          const empGroups = Array.from(byEmpleado.values());

          return (
            <div
              key={i}
             className={`h-28 rounded-lg border border-slate-300 p-1.5 relative overflow-visible ${
  isWeekend ? "bg-slate-200" : "bg-white"
}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${isToday ? "font-semibold" : "text-slate-600"}`}>
                  {day}
                </span>
              </div>

              <div className="mt-1 space-y-1">
                {empGroups.slice(0, 2).map((group) => {
                  const emp = group.empleado;
                  const count = group.entries.length;
                  const initials = `${emp.nombre?.charAt(0) || ""}${emp.apellido?.charAt(0) || ""}`;

                  return (
                    <button
                      key={emp._id}
                      onClick={() => {
                        const firstEv = group.entries[0];
                        const item = firstEv.item;
                        const baseDate =
                          firstEv.fecha ||
                          parsePeriodoToDate(firstEv.periodo) ||
                          cellDate;
                        const hito = {
                          periodo: firstEv.periodo,
                          fecha: baseDate.toISOString(),
                          metas: item.metas || [],
                        };
                        openHitoModal(item, [emp], hito);
                      }}
                      className="w-full group rounded-md border border-slate-300 px-1.5 py-1 text-[11px] text-left hover:bg-slate-50 transition flex items-center gap-1.5"
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-600 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                        {initials}
                      </div>
                      <span className="truncate">
                        {emp.nombre} {emp.apellido}
                      </span>
                      {count > 1 && (
                        <span className="text-[9px] opacity-70 ml-auto">
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}

                {empGroups.length > 2 && (
                  <button
                    onClick={() => setExpandedDay(cellDate)}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    +{empGroups.length - 2} más…
                  </button>
                )}
              </div>

              {/* Popover flotante por empleado */}
              {isExpanded && (
                <div className="absolute top-8 left-0 right-0 z-50 bg-white border border-slate-200 rounded-md shadow-lg p-2 max-h-40 overflow-y-auto text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">
                      {cellDate.toLocaleDateString("es-AR")}
                    </span>
                    <button
                      className="text-slate-400 hover:text-slate-600 text-xs"
                      onClick={() => setExpandedDay(null)}
                    >
                      ✕
                    </button>
                  </div>
                  {empGroups.map((group, idx) => {
                    const emp = group.empleado;
                    const count = group.entries.length;
                    const initials = `${emp.nombre?.charAt(0) || ""}${emp.apellido?.charAt(0) || ""}`;

                    return (
                      <div
                        key={`${emp._id}-${idx}`}
                        className="px-1.5 py-1 hover:bg-slate-100 cursor-pointer rounded-md flex items-center gap-1.5"
                        onClick={() => {
                          const firstEv = group.entries[0];
                          const item = firstEv.item;
                          const baseDate =
                            firstEv.fecha ||
                            parsePeriodoToDate(firstEv.periodo) ||
                            cellDate;
                          const hito = {
                            periodo: firstEv.periodo,
                            fecha: baseDate.toISOString(),
                            metas: item.metas || [],
                          };
                          openHitoModal(item, [emp], hito);
                          setExpandedDay(null);
                        }}
                      >
                        <div className="w-4 h-4 rounded-full bg-slate-600 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                          {initials}
                        </div>
                        <span className="truncate">
                          {emp.nombre} {emp.apellido}
                        </span>
                        {count > 1 && (
                          <span className="text-[9px] opacity-70 ml-auto">
                            ({count})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
