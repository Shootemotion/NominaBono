import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CalendarView({ agendaList, openHitoModal }) {
  const today = new Date();
  const [offset, setOffset] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null); // ✅ estaba faltando

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

  const byDay = agendaList.reduce((acc, e) => {
    const f = new Date(e.fecha);
    if (f.getFullYear() === year && f.getMonth() === month) {
      const d = f.getDate();
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
          if (!cellDate) return <div key={i} className="h-28 rounded-lg border border-slate-100 bg-slate-100" />;

          const day = cellDate.getDate();
          const items = byDay[day] || [];
          const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
          const isExpanded = expandedDay?.toDateString() === cellDate.toDateString();

          return (
            <div
              key={i}
              className={`h-28 rounded-lg border border-slate-300 p-1.5 relative overflow-hidden ${
                isWeekend ? "bg-slate-200" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear()
                    ? "font-semibold"
                    : "text-slate-600"
                }`}>
                  {day}
                </span>
              </div>

              <div className="mt-1 space-y-1">
                {items.slice(0, 2).map((row, idx) => (
                  <button
                    key={`${row.key}-${idx}`}
                    onClick={() => openHitoModal(row.item, row.empleados || [], {
                      periodo: row.periodo,
                      fecha: row.fecha,
                      metas: row.item.metas || [],
                    })}
                    className="w-full group rounded-md border border-slate-400 px-1.5 py-1 text-[11px] text-left hover:bg-slate-50 transition truncate"
                  >
                    {row.item._tipo === "objetivo" ? "🎯" : "💡"} {row.item.nombre}
                  </button>
                ))}
                {items.length > 2 && (
                  <button
                    onClick={() => setExpandedDay(cellDate)}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    +{items.length - 2} más…
                  </button>
                )}
              </div>

              {/* Popover flotante */}
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
                  {items.map((row, idx) => (
                    <div
                      key={`${row.key}-popover-${idx}`}
                      className="px-1.5 py-1 hover:bg-slate-100 cursor-pointer rounded-md"
                      onClick={() => {
                        openHitoModal(row.item, row.empleados || [], {
                          periodo: row.periodo,
                          fecha: row.fecha,
                          metas: row.item.metas || [],
                        });
                        setExpandedDay(null);
                      }}
                    >
                      {row.item._tipo === "objetivo" ? "🎯" : "💡"} {row.item.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
