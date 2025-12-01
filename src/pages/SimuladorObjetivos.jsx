import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "../lib/api";
import {
    Trash2,
    Plus,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Target,
    Lightbulb
} from "lucide-react";

export default function SimuladorObjetivos() {
    const [objetivos, setObjetivos] = useState([
        {
            id: 1,
            nombre: "Objetivo de Ejemplo",
            pesoBase: 100,
            frecuencia: "trimestral",
            expanded: true,
            metas: [
                {
                    id: 101,
                    nombre: "Meta 1",
                    unidad: "Porcentual",
                    operador: ">=",
                    esperado: 100,
                    pesoMeta: 100,
                    modoAcumulacion: "periodo",
                    reglaCierre: "promedio",
                    reconoceEsfuerzo: true,
                    permiteOver: false,
                    tolerancia: 0,
                    registros: [],
                },
            ],
        },
    ]);

    const [aptitudes, setAptitudes] = useState([
        {
            id: 201,
            nombre: "Aptitud Ejemplo",
            pesoBase: 100,
            valor: 3,
        },
    ]);

    const [pesoObj, setPesoObj] = useState(70);
    const [pesoApt, setPesoApt] = useState(30);
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);

    // Generador de periodos según frecuencia
    const getPeriodos = (frecuencia) => {
        if (frecuencia === "mensual") {
            return Array.from({ length: 12 }, (_, i) => `M${i + 1}`);
        }
        return ["Q1", "Q2", "Q3", "Q4"];
    };

    // --- HANDLERS OBJETIVOS ---
    const handleAddObjetivo = () => {
        setObjetivos([
            ...objetivos,
            {
                id: Date.now(),
                nombre: "Nuevo Objetivo",
                pesoBase: 0,
                frecuencia: "trimestral",
                expanded: true,
                metas: [],
            },
        ]);
    };

    const handleDeleteObjetivo = (id) => {
        setObjetivos(objetivos.filter(o => o.id !== id));
    };

    const handleToggleCollapse = (id) => {
        setObjetivos(objetivos.map(o => o.id === id ? { ...o, expanded: !o.expanded } : o));
    };

    const handleAddMeta = (objId) => {
        setObjetivos(
            objetivos.map((obj) =>
                obj.id === objId
                    ? {
                        ...obj,
                        metas: [
                            ...obj.metas,
                            {
                                id: Date.now(),
                                nombre: "Nueva Meta",
                                unidad: "Porcentual",
                                operador: ">=",
                                esperado: 100,
                                pesoMeta: 0,
                                modoAcumulacion: "periodo",
                                reglaCierre: "promedio",
                                reconoceEsfuerzo: true,
                                permiteOver: false,
                                tolerancia: 0,
                                registros: [],
                            },
                        ],
                    }
                    : obj
            )
        );
    };

    const handleDeleteMeta = (objId, metaId) => {
        setObjetivos(
            objetivos.map((obj) =>
                obj.id === objId
                    ? { ...obj, metas: obj.metas.filter(m => m.id !== metaId) }
                    : obj
            )
        );
    };

    const updateObjetivo = (id, field, value) => {
        setObjetivos(
            objetivos.map((obj) => (obj.id === id ? { ...obj, [field]: value } : obj))
        );
    };

    const updateMeta = (objId, metaId, field, value) => {
        setObjetivos(
            objetivos.map((obj) =>
                obj.id === objId
                    ? {
                        ...obj,
                        metas: obj.metas.map((m) =>
                            m.id === metaId ? { ...m, [field]: value } : m
                        ),
                    }
                    : obj
            )
        );
    };

    const updateRegistro = (objId, metaId, periodo, valor) => {
        setObjetivos(
            objetivos.map((obj) =>
                obj.id === objId
                    ? {
                        ...obj,
                        metas: obj.metas.map((m) => {
                            if (m.id !== metaId) return m;
                            const regs = m.registros.filter((r) => r.periodo !== periodo);
                            if (valor !== "") {
                                regs.push({ periodo, valor: Number(valor) });
                            }
                            return { ...m, registros: regs };
                        }),
                    }
                    : obj
            )
        );
    };

    // --- HANDLERS APTITUDES ---
    const handleAddAptitud = () => {
        setAptitudes([
            ...aptitudes,
            {
                id: Date.now(),
                nombre: "Nueva Aptitud",
                pesoBase: 0,
                valor: 3,
            },
        ]);
    };

    const handleDeleteAptitud = (id) => {
        setAptitudes(aptitudes.filter(a => a.id !== id));
    };

    const updateAptitud = (id, field, value) => {
        setAptitudes(
            aptitudes.map((apt) => (apt.id === id ? { ...apt, [field]: value } : apt))
        );
    };

    // --- RESET ---
    const handleReset = () => {
        if (confirm("¿Estás seguro de borrar toda la configuración actual?")) {
            setObjetivos([]);
            setAptitudes([]);
            setResultado(null);
            toast.info("Simulación reiniciada");
        }
    };

    // --- SIMULACIÓN ---
    const simular = async () => {
        setLoading(true);
        try {
            // Normalizar aptitudes (1-5 -> 0-100)
            const aptitudesPayload = aptitudes.map(a => ({
                nombre: a.nombre,
                pesoBase: Number(a.pesoBase),
                valor: (Number(a.valor) / 5) * 100
            }));

            const payload = {
                objetivos: objetivos.map((o) => ({
                    nombre: o.nombre,
                    pesoBase: Number(o.pesoBase),
                    metas: o.metas.map((m) => ({
                        nombre: m.nombre,
                        unidad: m.unidad,
                        operador: m.operador,
                        esperado: Number(m.esperado),
                        pesoMeta: Number(m.pesoMeta),
                        modoAcumulacion: m.modoAcumulacion,
                        reglaCierre: m.reglaCierre,
                        registros: m.registros,
                        reconoceEsfuerzo: m.reconoceEsfuerzo,
                        permiteOver: m.permiteOver,
                        tolerancia: Number(m.tolerancia),
                    })),
                })),
                aptitudes: aptitudesPayload,
                pesoObj: Number(pesoObj) / 100,
                pesoApt: Number(pesoApt) / 100,
            };

            const res = await api("/simulacion/calcular", {
                method: "POST",
                body: payload,
            });
            setResultado(res);
            toast.success("Simulación completada");
        } catch (error) {
            console.error(error);
            toast.error("Error al simular");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
            {/* HEADER: Título + Controles + Resultados Rápidos */}
            <div className="bg-slate-950 text-white p-6 rounded-xl shadow-xl border border-slate-800">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                    {/* Título y Config Global */}
                    <div className="flex flex-col gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                🧪 Simulador
                            </h1>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="text-slate-400 hover:text-white hover:bg-white/10"
                                title="Nueva Simulación"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reiniciar
                            </Button>
                        </div>

                        <div className="flex gap-4 items-center bg-white/5 p-3 rounded-lg border border-white/10 w-fit">
                            <div className="flex items-center gap-2 text-sm border-r border-white/20 pr-4">
                                <label className="font-medium text-slate-300">Peso Obj (%):</label>
                                <Input
                                    type="number"
                                    className="w-16 h-8 bg-slate-900 border-slate-700 text-white"
                                    value={pesoObj}
                                    onChange={(e) => setPesoObj(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm pr-4">
                                <label className="font-medium text-slate-300">Peso Apt (%):</label>
                                <Input
                                    type="number"
                                    className="w-16 h-8 bg-slate-900 border-slate-700 text-white"
                                    value={pesoApt}
                                    onChange={(e) => setPesoApt(e.target.value)}
                                />
                            </div>
                            <Button onClick={simular} disabled={loading} size="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {loading ? "Calculando..." : "▶ Simular"}
                            </Button>
                        </div>
                    </div>

                    {/* Panel de Resultados (Header) */}
                    {resultado && (
                        <div className="flex-1 w-full lg:w-auto flex flex-col sm:flex-row items-center justify-end gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="text-center">
                                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Objetivos</div>
                                <div className="text-3xl font-bold text-blue-400">{resultado.resumen.objetivos}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Aptitudes</div>
                                <div className="text-3xl font-bold text-amber-400">{resultado.resumen.aptitudes}%</div>
                            </div>
                            <div className="h-12 w-px bg-slate-700 hidden sm:block"></div>
                            <div className="text-center">
                                <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1 font-semibold">Score Global</div>
                                <div className="text-5xl font-black text-emerald-400 drop-shadow-lg">{resultado.resumen.global}%</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* COLUMNA IZQUIERDA: OBJETIVOS */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-blue-700">
                            <Target className="w-5 h-5" /> Objetivos
                        </h2>
                        <Button variant="outline" size="sm" onClick={handleAddObjetivo} className="border-dashed border-blue-300 text-blue-700 hover:bg-blue-50">
                            <Plus className="w-4 h-4 mr-1" /> Agregar Objetivo
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {objetivos.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                No hay objetivos. Agregá uno para empezar.
                            </div>
                        )}
                        {objetivos.map((obj) => (
                            <Card key={obj.id} className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden transition-all">
                                <CardHeader className="pb-3 bg-slate-50/80 border-b cursor-pointer select-none hover:bg-slate-100/80 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-400"
                                            onClick={() => handleToggleCollapse(obj.id)}
                                        >
                                            {obj.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </Button>

                                        <div className="flex-1 flex flex-wrap gap-4 justify-between items-center" onClick={() => handleToggleCollapse(obj.id)}>
                                            <div className="space-y-1 flex-1 min-w-[150px]">
                                                {obj.expanded ? (
                                                    <>
                                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                                            Nombre
                                                        </label>
                                                        <Input
                                                            value={obj.nombre}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => updateObjetivo(obj.id, "nombre", e.target.value)}
                                                            className="font-semibold h-9"
                                                        />
                                                    </>
                                                ) : (
                                                    <div className="font-semibold text-lg">{obj.nombre}</div>
                                                )}
                                            </div>

                                            {obj.expanded && (
                                                <>
                                                    <div className="w-20">
                                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                                            Peso %
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={obj.pesoBase}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => updateObjetivo(obj.id, "pesoBase", e.target.value)}
                                                            className="h-9 text-center"
                                                        />
                                                    </div>
                                                    <div className="w-28">
                                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                                            Frecuencia
                                                        </label>
                                                        <select
                                                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs"
                                                            value={obj.frecuencia}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => updateObjetivo(obj.id, "frecuencia", e.target.value)}
                                                        >
                                                            <option value="trimestral">Trimestral</option>
                                                            <option value="mensual">Mensual</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}

                                            {/* Resultado individual (Badge) */}
                                            {resultado && (
                                                <Badge variant="outline" className="bg-white ml-2">
                                                    Score: <span className="font-bold ml-1 text-blue-600">
                                                        {resultado.objetivos.find(o => o.nombre === obj.nombre)?.actual ?? "-"}%
                                                    </span>
                                                </Badge>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteObjetivo(obj.id); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>

                                {obj.expanded && (
                                    <CardContent className="space-y-4 pt-4 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-4">
                                            {obj.metas.map((meta) => (
                                                <div
                                                    key={meta.id}
                                                    className="rounded-lg border bg-white p-3 space-y-3 shadow-sm relative group"
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleDeleteMeta(obj.id, meta.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>

                                                    {/* Config Meta */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 pr-6">
                                                        <div className="md:col-span-2">
                                                            <label className="text-[10px] text-muted-foreground font-medium">Meta</label>
                                                            <Input
                                                                value={meta.nombre}
                                                                className="h-8 text-sm"
                                                                onChange={(e) =>
                                                                    updateMeta(obj.id, meta.id, "nombre", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted-foreground font-medium">Unidad</label>
                                                            <select
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                                                value={meta.unidad}
                                                                onChange={(e) =>
                                                                    updateMeta(obj.id, meta.id, "unidad", e.target.value)
                                                                }
                                                            >
                                                                <option value="Porcentual">Porcentual</option>
                                                                <option value="Numerico">Numérico</option>
                                                                <option value="Cumple/No Cumple">Binaria</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted-foreground font-medium">Peso %</label>
                                                            <Input
                                                                type="number"
                                                                className="h-8 text-sm"
                                                                value={meta.pesoMeta}
                                                                onChange={(e) =>
                                                                    updateMeta(obj.id, meta.id, "pesoMeta", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted-foreground font-medium">Esperado</label>
                                                            <Input
                                                                type="number"
                                                                className="h-8 text-sm"
                                                                value={meta.esperado}
                                                                onChange={(e) =>
                                                                    updateMeta(obj.id, meta.id, "esperado", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted-foreground font-medium">Acumulación</label>
                                                            <select
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                                                value={meta.modoAcumulacion}
                                                                onChange={(e) =>
                                                                    updateMeta(obj.id, meta.id, "modoAcumulacion", e.target.value)
                                                                }
                                                            >
                                                                <option value="periodo">Período</option>
                                                                <option value="acumulativo">Acumulativo</option>
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="text-[10px] text-muted-foreground font-medium">Cierre</label>
                                                            <select
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                                                value={meta.reglaCierre}
                                                                onChange={(e) =>
                                                                    updateMeta(obj.id, meta.id, "reglaCierre", e.target.value)
                                                                }
                                                            >
                                                                <option value="promedio">Promedio</option>
                                                                <option value="cierre_unico">Último Valor</option>
                                                                <option value="umbral_periodos">Umbral Períodos</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Opciones Avanzadas Compactas */}
                                                    <div className="flex flex-wrap gap-3 p-2 bg-slate-100 rounded text-xs items-center">
                                                        <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                checked={meta.reconoceEsfuerzo}
                                                                onChange={(e) => updateMeta(obj.id, meta.id, "reconoceEsfuerzo", e.target.checked)}
                                                            />
                                                            Reconoce Esfuerzo
                                                        </label>
                                                        <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                checked={meta.permiteOver}
                                                                onChange={(e) => updateMeta(obj.id, meta.id, "permiteOver", e.target.checked)}
                                                            />
                                                            Permite Over
                                                        </label>
                                                        <div className="flex items-center gap-1.5 ml-auto">
                                                            <span className="text-muted-foreground">Tol:</span>
                                                            <Input
                                                                type="number"
                                                                className="w-12 h-6 text-xs px-1 bg-white"
                                                                value={meta.tolerancia}
                                                                onChange={(e) => updateMeta(obj.id, meta.id, "tolerancia", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Grid de Carga */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                            Carga ({obj.frecuencia})
                                                        </label>
                                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                                                            {getPeriodos(obj.frecuencia).map((p) => {
                                                                const reg = meta.registros.find(
                                                                    (r) => r.periodo === p
                                                                );
                                                                return (
                                                                    <div key={p} className="col-span-1">
                                                                        <label className="text-[9px] text-center block text-muted-foreground mb-0.5">
                                                                            {p}
                                                                        </label>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="-"
                                                                            className="text-center h-7 text-xs px-0.5 bg-slate-50 focus:bg-white transition-colors"
                                                                            value={reg?.valor ?? ""}
                                                                            onChange={(e) =>
                                                                                updateRegistro(
                                                                                    obj.id,
                                                                                    meta.id,
                                                                                    p,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full border border-dashed text-muted-foreground hover:text-blue-600 hover:border-blue-300 h-8 text-xs"
                                                onClick={() => handleAddMeta(obj.id)}
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> Agregar Meta
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: APTITUDES */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-amber-700">
                            <Lightbulb className="w-5 h-5" /> Aptitudes
                        </h2>
                        <Button variant="outline" size="sm" onClick={handleAddAptitud} className="border-dashed border-amber-300 text-amber-700 hover:bg-amber-50">
                            <Plus className="w-4 h-4 mr-1" /> Agregar Aptitud
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {aptitudes.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                No hay aptitudes.
                            </div>
                        )}
                        {aptitudes.map((apt) => (
                            <Card key={apt.id} className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    onClick={() => handleDeleteAptitud(apt.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                                <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[150px] space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nombre</label>
                                        <Input
                                            value={apt.nombre}
                                            className="h-9 font-medium"
                                            onChange={(e) => updateAptitud(apt.id, "nombre", e.target.value)}
                                        />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Peso %</label>
                                        <Input
                                            type="number"
                                            className="h-9 text-center"
                                            value={apt.pesoBase}
                                            onChange={(e) => updateAptitud(apt.id, "pesoBase", e.target.value)}
                                        />
                                    </div>
                                    <div className="w-32 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Valor (1-5)</label>
                                        <select
                                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm font-medium"
                                            value={apt.valor}
                                            onChange={(e) => updateAptitud(apt.id, "valor", e.target.value)}
                                        >
                                            <option value="1">1 - Insuficiente</option>
                                            <option value="2">2 - Regular</option>
                                            <option value="3">3 - Cumple</option>
                                            <option value="4">4 - Supera</option>
                                            <option value="5">5 - Sobresaliente</option>
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Desglose de Aptitudes (Visible solo si hay resultados) */}
                    {resultado && (
                        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-500">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Detalle de Resultados</h3>
                            <div className="space-y-2">
                                {resultado.aptitudes.map((apt, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-slate-100 shadow-sm">
                                        <span className="font-medium text-slate-700">{apt.nombre}</span>
                                        <span className="font-bold text-amber-600">{apt.actual}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
