import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, Calculator, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfiguracionBono() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [config, setConfig] = useState({
        // pesos: { objetivos: 70, competencias: 30 }, // Removed
        escala: { tipo: "lineal", minPct: 0, maxPct: 1.0, umbral: 60, tramos: [] },
        bonoTarget: 1.0,
    });

    useEffect(() => {
        loadConfig();
    }, [year]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await api(`/bono/config/${year}`);
            if (data && !data.isNew) {
                setConfig({
                    // pesos: { objetivos: 70, competencias: 30 }, // Removed
                    escala: data.escala || { tipo: "lineal", minPct: 0, maxPct: 1.0, umbral: 60, tramos: [] },
                    bonoTarget: data.bonoTarget ?? 1.0,
                });
            } else {
                // Defaults
                setConfig({
                    // pesos: { objetivos: 70, competencias: 30 }, // Removed
                    escala: { tipo: "lineal", minPct: 0, maxPct: 1.0, umbral: 60, tramos: [] },
                    bonoTarget: 1.0,
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("Error cargando configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api(`/bono/config/${year}`, {
                method: "POST",
                body: config,
            });
            toast.success("Configuración guardada");
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar");
        }
    };

    const handleCalculate = async () => {
        if (!confirm(`¿Estás seguro de recalcular los bonos para el año ${year}? Esto actualizará los borradores existentes.`)) return;

        setCalculating(true);
        try {
            // 1. Auto-save config first to ensure backend has it
            await api(`/bono/config/${year}`, {
                method: "POST",
                body: config,
            });

            // 2. Trigger calculation
            const res = await api(`/bono/calculate/${year}`, { method: "POST" });
            toast.success(res.message || "Cálculo finalizado");
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Error al calcular");
        } finally {
            setCalculating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f9fc] p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Configuración de Bonos</h1>
                        <p className="text-slate-500">Define los parámetros para el cálculo del bono anual.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Save size={18} /> Guardar
                        </Button>
                    </div>
                </div>

                {/* Main Config Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">

                    {/* 2. Bono Target */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                            Bono Target (Base)
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Define cuántos sueldos representa el bono al 100% de cumplimiento.
                            <br />
                            <span className="text-xs italic">Ejemplo: 1.5 significa que el bono "ideal" es un sueldo y medio.</span>
                        </p>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Multiplicador de Sueldo</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.bonoTarget}
                                    onChange={(e) => setConfig({ ...config, bonoTarget: Number(e.target.value) })}
                                    className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                                <span className="text-sm text-slate-500">
                                    (Ej: 1.0 = 1 sueldo completo, 1.5 = 1 sueldo y medio)
                                </span>
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-100" />

                    {/* 3. Escala de Pago */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                            Escala de Pago
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Define cómo se traduce el Score Global (0-100%) en el porcentaje de pago del bono.
                        </p>

                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setConfig({ ...config, escala: { ...config.escala, tipo: "lineal" } })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${config.escala.tipo === "lineal" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                                Escala Lineal
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, escala: { ...config.escala, tipo: "tramos" } })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${config.escala.tipo === "tramos" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                                Por Tramos
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            {config.escala.tipo === "lineal" ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Umbral Mínimo (Score %)</label>
                                        <input
                                            type="number"
                                            value={config.escala.umbral}
                                            onChange={(e) => setConfig({ ...config, escala: { ...config.escala, umbral: Number(e.target.value) } })}
                                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Menos de este score, el bono es 0%.
                                            <br />
                                            <span className="italic">Ej: 60% significa que con 59% de score no cobra nada.</span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">% Pago Mínimo</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={config.escala.minPct}
                                            onChange={(e) => setConfig({ ...config, escala: { ...config.escala, minPct: Number(e.target.value) } })}
                                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Porcentaje mínimo de pago al alcanzar el umbral.
                                            <br />
                                            <span className="italic">Ej: 0.05 significa que al llegar al umbral cobra el 5% del bono.</span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tope Máximo de Bono</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={config.escala.maxPct}
                                            onChange={(e) => setConfig({ ...config, escala: { ...config.escala, maxPct: Number(e.target.value) } })}
                                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Porcentaje a pagar si se alcanza el 100% de Score.
                                            <br />
                                            <span className="italic">Ej: 1.0 = 100% del bono target. 1.2 = 120% (sobrecumplimiento).</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 italic">
                                    Configuración de tramos avanzada no implementada en UI simple.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Action: Calculate */}
                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <Button
                            onClick={handleCalculate}
                            disabled={calculating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                        >
                            <Calculator size={18} />
                            {calculating ? "Calculando..." : "Ejecutar Cálculo de Bonos"}
                        </Button>
                    </div>

                </div>

                {/* Simulator Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calculator size={20} className="text-blue-600" />
                        Simulador Rápido
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Prueba cómo quedaría el bono con la configuración actual para un score hipotético.
                    </p>

                    <div className="flex flex-col md:flex-row gap-6 items-end bg-slate-50 p-6 rounded-lg border border-slate-100">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Score Global (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Ej: 85"
                                id="simScore"
                                className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sueldo Base</label>
                            <input
                                type="number"
                                placeholder="Ej: 1000000"
                                id="simSueldo"
                                className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <Button
                            onClick={() => {
                                const score = Number(document.getElementById('simScore').value);
                                const sueldo = Number(document.getElementById('simSueldo').value);

                                let pct = 0;
                                let explanation = "";

                                if (config.escala.tipo === 'lineal') {
                                    const { minPct, maxPct, umbral } = config.escala;
                                    if (score < umbral) {
                                        pct = 0;
                                        explanation = `Score (${score}%) debajo del umbral (${umbral}%). Pago 0%.`;
                                    } else if (score >= 100) {
                                        pct = maxPct;
                                        explanation = `Score (${score}%) alcanza/supera 100%. Se paga el tope configurado (${maxPct * 100}%).`;
                                    } else {
                                        const range = 100 - umbral;
                                        const progress = (score - umbral) / range;
                                        pct = minPct + progress * (maxPct - minPct);
                                        explanation = `Score ${score}% está al ${(progress * 100).toFixed(0)}% del rango entre ${umbral}% y 100%.`;
                                    }
                                } else {
                                    // Tramos simple logic for sim
                                    pct = score >= 90 ? 1.0 : 0;
                                    explanation = score >= 90 ? "Cumple tramo >90%" : "No cumple tramo";
                                }

                                const bonoBase = sueldo * config.bonoTarget;
                                const bonoFinal = bonoBase * pct;

                                document.getElementById('simResult').innerHTML = `
                                    <div class="space-y-1">
                                        <div class="text-sm text-slate-600">Bono Base (Target): <span class="font-semibold">$${bonoBase.toLocaleString()}</span></div>
                                        <div class="text-sm text-slate-600">Porcentaje Logrado: <span class="font-semibold text-blue-600">${(pct * 100).toFixed(1)}%</span> del Target</div>
                                        <div class="text-xs text-slate-500 italic border-t border-slate-200 pt-1 mt-1">${explanation}</div>
                                        <div class="text-lg font-bold text-emerald-600 mt-2">A Cobrar: $${bonoFinal.toLocaleString()}</div>
                                    </div>
                                `;
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white"
                        >
                            Simular
                        </Button>

                        <div id="simResult" className="flex-1 border-l-2 border-slate-200 pl-6 py-1">
                            <span className="text-sm text-slate-400 italic">Ingresa valores y pulsa Simular...</span>
                        </div>
                    </div>
                </div>

                {/* Examples Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Ejemplos de Referencia</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        A continuación se muestran ejemplos de cómo diferentes configuraciones afectan el pago del bono.
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Escenario</th>
                                    {/* <th className="px-4 py-3 font-medium">Pesos (Obj/Comp)</th> */}
                                    <th className="px-4 py-3 font-medium">Bono Target</th>
                                    <th className="px-4 py-3 font-medium">Escala</th>
                                    <th className="px-4 py-3 font-medium">Resultado Ejemplo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-700">Estándar</td>
                                    {/* <td className="px-4 py-3">70% / 30%</td> */}
                                    <td className="px-4 py-3">1.0 Sueldo</td>
                                    <td className="px-4 py-3">
                                        Lineal
                                        <div className="text-xs text-slate-400">Umbral 60%, Max 100%</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        Score 80% <span className="text-slate-400">→</span> Cobra <span className="font-bold text-emerald-600">0.8 Sueldos</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-700">Agresivo (Ventas)</td>
                                    {/* <td className="px-4 py-3">90% / 10%</td> */}
                                    <td className="px-4 py-3">3.0 Sueldos</td>
                                    <td className="px-4 py-3">
                                        Lineal con Cap
                                        <div className="text-xs text-slate-400">Umbral 80%, Cap 120%</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        Score 110% <span className="text-slate-400">→</span> Cobra <span className="font-bold text-emerald-600">3.6 Sueldos</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-700">Conservador</td>
                                    {/* <td className="px-4 py-3">50% / 50%</td> */}
                                    <td className="px-4 py-3">0.5 Sueldos</td>
                                    <td className="px-4 py-3">
                                        Tramos
                                        <div className="text-xs text-slate-400">&gt;90% paga 100%, sino 0%</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        Score 89% <span className="text-slate-400">→</span> Cobra <span className="font-bold text-rose-600">0 Sueldos</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-700">Incentivo Mínimo</td>
                                    {/* <td className="px-4 py-3">80% / 20%</td> */}
                                    <td className="px-4 py-3">1.0 Sueldo</td>
                                    <td className="px-4 py-3">
                                        Lineal
                                        <div className="text-xs text-slate-400">Umbral 50%, Min Pago 20%</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        Score 51% <span className="text-slate-400">→</span> Cobra <span className="font-bold text-emerald-600">0.2 Sueldos</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
