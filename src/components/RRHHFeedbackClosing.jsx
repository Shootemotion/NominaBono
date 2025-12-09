
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

export default function RRHHFeedbackClosing() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [comentarioRRHH, setComentarioRRHH] = useState("");
    const [closingId, setClosingId] = useState(null);

    const loadFeedbacks = async () => {
        setLoading(true);
        try {
            // Fetch ALL pending feedbacks (or maybe all feedbacks for the year? 
            // User said "ver de los 4 feedback...". 
            // Ideally we fetch all for the current year to show context, but let's start with pending for closing.
            // If we only fetch pending, we can't show the "4 feedback" slots if they are not pending.
            // But the endpoint /hr/pending only returns pending.
            // For now, we work with pending. If user wants full history, we'd need a different endpoint.
            // Let's assume pending is enough for "Closing".
            const res = await api("/feedbacks/hr/pending");
            setFeedbacks(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error(e);
            toast.error("Error al cargar feedbacks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeedbacks();
    }, []);

    // Group by Employee
    const grouped = useMemo(() => {
        const groups = {};
        feedbacks.forEach(f => {
            const empId = f.empleado?._id;
            if (!empId) return;
            if (!groups[empId]) {
                groups[empId] = {
                    empleado: f.empleado,
                    items: []
                };
            }
            groups[empId].items.push(f);
        });
        return Object.values(groups);
    }, [feedbacks]);

    const filtered = useMemo(() => {
        if (!search) return grouped;
        const s = search.toLowerCase();
        return grouped.filter(g =>
            g.empleado.nombre.toLowerCase().includes(s) ||
            g.empleado.apellido.toLowerCase().includes(s)
        );
    }, [grouped, search]);

    const handleClose = async (feedbackId) => {
        if (!confirm("¿Cerrar este feedback?")) return;
        setClosingId(feedbackId);
        try {
            await api("/feedbacks/hr/close-bulk", {
                method: "POST",
                body: { ids: [feedbackId], comentarioRRHH }
            });
            toast.success("Feedback cerrado");
            setComentarioRRHH("");
            loadFeedbacks();
        } catch (e) {
            console.error(e);
            toast.error("Error al cerrar");
        } finally {
            setClosingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Search */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar empleado..."
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="text-sm text-slate-500">
                    <strong>{feedbacks.length}</strong> feedbacks pendientes de cierre
                </div>
            </div>

            {/* Employee Cards */}
            <div className="grid grid-cols-1 gap-4">
                {filtered.map(group => {
                    const isExpanded = expandedEmployee === group.empleado._id;

                    // Sort items by period (Q1, Q2, Q3, FINAL)
                    const order = { "Q1": 1, "Q2": 2, "Q3": 3, "FINAL": 4 };
                    const sortedItems = [...group.items].sort((a, b) => (order[a.periodo] || 99) - (order[b.periodo] || 99));

                    return (
                        <Card key={group.empleado._id} className={`transition-all ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : 'hover:shadow-sm'}`}>
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedEmployee(isExpanded ? null : group.empleado._id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                        {group.empleado.nombre.charAt(0)}{group.empleado.apellido.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{group.empleado.apellido}, {group.empleado.nombre}</h3>
                                        <p className="text-xs text-slate-500">{group.empleado.area?.nombre || "Sin área"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2">
                                        {sortedItems.map(f => (
                                            <Badge key={f._id} variant="outline" className={`
                                                ${f.empleadoAck?.estado === 'ACK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                ${f.empleadoAck?.estado === 'CONTEST' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                                ${!f.empleadoAck?.estado ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}
                                            `}>
                                                {f.periodo}
                                            </Badge>
                                        ))}
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
                                    {sortedItems.map(f => (
                                        <div key={f._id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-slate-900 text-white">{f.periodo}</Badge>
                                                    <span className="text-xs text-slate-400">Vence: {f.fechaLimite ? new Date(f.fechaLimite).toLocaleDateString() : "-"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {f.empleadoAck?.estado === "ACK" && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle className="w-3 h-3 mr-1" /> Conforme</Badge>}
                                                    {f.empleadoAck?.estado === "CONTEST" && <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100"><AlertCircle className="w-3 h-3 mr-1" /> En Desacuerdo</Badge>}
                                                    {!f.empleadoAck?.estado && <Badge variant="outline" className="text-slate-400">Sin respuesta</Badge>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Feedback Jefe</label>
                                                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 min-h-[60px]">
                                                        {f.comentario || <span className="italic text-slate-400">Sin comentario</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Comentario Empleado</label>
                                                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 min-h-[60px]">
                                                        {f.comentarioEmpleado || <span className="italic text-slate-400">Sin comentario</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                                                <div className="flex-1 max-w-lg mr-4">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Comentario RRHH (Opcional)</label>
                                                    <Input
                                                        placeholder="Escribí un comentario de cierre..."
                                                        className="h-8 text-xs"
                                                        value={comentarioRRHH}
                                                        onChange={e => setComentarioRRHH(e.target.value)}
                                                    />
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleClose(f._id)}
                                                    disabled={closingId === f._id}
                                                    className="bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    {closingId === f._id ? "Cerrando..." : "Cerrar Feedback"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <p>No hay feedbacks pendientes de cierre.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
