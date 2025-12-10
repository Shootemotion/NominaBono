import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "react-toastify";
import { ChevronDown, ChevronRight, Search, Download, DollarSign, UserCircle2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ResultadosBono() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // State for accordion expansion
    const [expandedAreas, setExpandedAreas] = useState({});

    useEffect(() => {
        loadResults();
    }, [year]);

    const loadResults = async () => {
        setLoading(true);
        try {
            const data = await api(`/bono/results/${year}`);
            setResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error("Error cargando resultados");
        } finally {
            setLoading(false);
        }
    };

    const toggleArea = (areaName) => {
        setExpandedAreas(prev => ({ ...prev, [areaName]: !prev[areaName] }));
    };

    // Grouping logic
    const groupedData = useMemo(() => {
        const groups = {};

        // Filter first
        const filtered = results.filter(r => {
            const name = `${r.empleado?.nombre} ${r.empleado?.apellido}`.toLowerCase();
            return name.includes(searchTerm.toLowerCase());
        });

        filtered.forEach(r => {
            const area = r.snapshot?.areaNombre || "Sin Área";
            const sector = r.snapshot?.sectorNombre || "Sin Sector";

            if (!groups[area]) groups[area] = {};
            if (!groups[area][sector]) groups[area][sector] = [];

            groups[area][sector].push(r);
        });

        return groups;
    }, [results, searchTerm]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(val || 0);
    };

    return (
        <div className="min-h-screen bg-[#f5f9fc] p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Resultados de Bonos {year}</h1>
                        <p className="text-slate-500">Detalle de cálculo y asignación de bonos por desempeño.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar empleado..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                            />
                        </div>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <Download size={16} /> Exportar
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Cargando resultados...</div>
                ) : (
                    <div className="space-y-4">
                        {Object.keys(groupedData).length === 0 && (
                            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                                No hay resultados calculados para este año.
                            </div>
                        )}

                        {Object.entries(groupedData).map(([areaName, sectors]) => (
                            <div key={areaName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Area Header */}
                                <button
                                    onClick={() => toggleArea(areaName)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedAreas[areaName] ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                                        <h3 className="font-bold text-slate-800 text-lg">{areaName}</h3>
                                        <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-600">
                                            {Object.values(sectors).reduce((acc, curr) => acc + curr.length, 0)} Empleados
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-500 font-medium">
                                        Total Bonos: {formatCurrency(Object.values(sectors).flat().reduce((acc, curr) => acc + (curr.bonoFinal || 0), 0))}
                                    </div>
                                </button>

                                {/* Sectors & Employees */}
                                {expandedAreas[areaName] && (
                                    <div className="p-0">
                                        {Object.entries(sectors).map(([sectorName, employees]) => (
                                            <div key={sectorName} className="border-b border-slate-100 last:border-0">
                                                <div className="px-6 py-2 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    {sectorName}
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {employees.map(emp => (
                                                        <div key={emp._id} className="p-6 hover:bg-blue-50/30 transition-colors grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-6 items-start">

                                                            {/* 1. Employee Info */}
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                                                                    {emp.empleado?.fotoUrl ? (
                                                                        <img src={emp.empleado.fotoUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                            <UserCircle2 size={24} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 text-base">
                                                                        {emp.empleado?.nombre} {emp.empleado?.apellido}
                                                                    </div>
                                                                    <div className="text-sm text-slate-500">{emp.snapshot?.puesto}</div>
                                                                    <div className="text-xs text-slate-400 mt-1">Ingreso: {new Date(emp.snapshot?.fechaIngreso).toLocaleDateString()}</div>
                                                                </div>
                                                            </div>

                                                            {/* 2. Feedback & Scores */}
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-slate-500">Objetivos ({emp.pesos?.objetivos}%):</span>
                                                                    <span className="font-bold text-blue-600">{Math.round(emp.resultado?.objetivos || 0)}%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-slate-500">Competencias ({emp.pesos?.competencias}%):</span>
                                                                    <span className="font-bold text-amber-500">{Math.round(emp.resultado?.competencias || 0)}%</span>
                                                                </div>
                                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                                    <span className="font-bold text-slate-700 text-sm">Score Global:</span>
                                                                    <Badge className="bg-slate-800 text-white hover:bg-slate-900">
                                                                        {Math.round(emp.resultado?.total || 0)}%
                                                                    </Badge>
                                                                </div>
                                                            </div>

                                                            {/* 3. Manager Comment */}
                                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 italic relative">
                                                                <MessageSquare className="w-4 h-4 text-slate-300 absolute top-2 right-2" />
                                                                <p className="line-clamp-3">
                                                                    {emp.feedbackComentario || "Sin comentarios del líder."}
                                                                </p>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="text-xs text-slate-400 uppercase font-bold">Bono Calculado</div>
                                                                <div className="text-2xl font-black text-emerald-600 flex items-center">
                                                                    {formatCurrency(emp.bonoFinal)}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    Base: {formatCurrency(emp.bonoBase)}
                                                                    {emp.bonoBase > 0 && (
                                                                        <span className="ml-1 text-blue-600 font-medium">
                                                                            ({Math.round((emp.bonoFinal / emp.bonoBase) * 100)}%)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Badge variant="outline" className={`mt-2 border-slate-200 ${emp.estado === 'calculado' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>
                                                                    {emp.estado === "borrador" ? "Borrador" : emp.estado === "calculado" ? "Preliminar" : "Aprobado"}
                                                                </Badge>
                                                            </div>

                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
