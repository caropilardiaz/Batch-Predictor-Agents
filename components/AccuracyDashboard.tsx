
import React, { useMemo, useState } from 'react';
import type { BatchData } from '../types';
import { calculateSmartEstimation, checkAccuracy, parseManualRange, checkManualAccuracy } from '../utils/estimationLogic';
import { timeToMinutes } from '../utils/time';
import { ChartIcon, SparklesIcon } from './icons';

interface AccuracyDashboardProps {
  data: BatchData[];
}

type ViewFilter = 'none' | 'wins' | 'misses';

export const AccuracyDashboard: React.FC<AccuracyDashboardProps> = ({ data }) => {
    const [filter, setFilter] = useState<ViewFilter>('none');

    const stats = useMemo(() => {
        let manualHits = 0;
        let manualHitsWithTolerance = 0; // Manual con ±5 min tolerancia
        let smartHits = 0;
        let smartInclusiveHits = 0; // Incluye casos amarillos (por debajo del rango)
        let totalEvaluated = 0;
        
        const comparisons: {
            id: number;
            date: string;
            real: string;
            manual: { range: string; hit: boolean };
            smart: { range: string; hit: boolean; adjustment: number };
        }[] = [];

        data.forEach(job => {
            totalEvaluated++;

            // 1. Evaluate Manual - Both strict and with tolerance
            const manualRange = parseManualRange(job.estimacion);
            let manualSuccess = false;
            let manualSuccessWithTolerance = false;
            if (manualRange) {
                manualSuccess = checkManualAccuracy(manualRange, job.horaReal);
                manualSuccessWithTolerance = checkAccuracy(manualRange, job.horaReal);
                if (manualSuccess) manualHits++;
                if (manualSuccessWithTolerance) manualHitsWithTolerance++;
            }

            // 2. Evaluate Smart Mode (AI) + External Adjustment
            const adjustment = job.adjustmentMinutes || 0;
            const smartResult = calculateSmartEstimation(job, data, adjustment);
            let smartSuccess = false;
            let smartInclusiveSuccess = false;
            let smartRangeString = "N/A";
            
            if (smartResult.finalPrediction) {
                smartRangeString = `${smartResult.finalPrediction.start} - ${smartResult.finalPrediction.end}`;
                smartSuccess = checkAccuracy(smartResult.finalPrediction, job.horaReal);
                
                const realMinutes = timeToMinutes(job.horaReal);
                const startMinutes = timeToMinutes(smartResult.finalPrediction.start);
                const endMinutes = timeToMinutes(smartResult.finalPrediction.end);
                
                if (smartSuccess) {
                    smartHits++;
                    smartInclusiveHits++;
                } else {
                    // Verificar si es un caso amarillo (por debajo del rango)
                    if (realMinutes < startMinutes) {
                        smartInclusiveSuccess = true;
                        smartInclusiveHits++;
                    }
                }
            }

            comparisons.push({
                id: job.id,
                date: job.fechaReal,
                real: job.horaReal,
                manual: { range: job.estimacion, hit: manualSuccess },
                smart: { range: smartRangeString, hit: smartSuccess, adjustment }
            });
        });

        return {
            manualRate: totalEvaluated > 0 ? (manualHits / totalEvaluated) * 100 : 0,
            manualRateWithTolerance: totalEvaluated > 0 ? (manualHitsWithTolerance / totalEvaluated) * 100 : 0,
            smartRate: totalEvaluated > 0 ? (smartHits / totalEvaluated) * 100 : 0,
            smartInclusiveRate: totalEvaluated > 0 ? (smartInclusiveHits / totalEvaluated) * 100 : 0,
            manualHits,
            manualHitsWithTolerance,
            smartHits,
            smartInclusiveHits,
            total: totalEvaluated,
            comparisons
        };
    }, [data]);

    const displayedItems = useMemo(() => {
        if (filter === 'wins') {
            return stats.comparisons.filter(c => c.smart.hit && !c.manual.hit);
        }
        if (filter === 'misses') {
            return stats.comparisons.filter(c => !c.smart.hit);
        }
        return [];
    }, [filter, stats.comparisons]);

    return (
        <div className="rounded-lg shadow-lg p-4 md:p-6 mb-8 border-b-4 transition-all duration-500" style={{ background: 'var(--macro-blue-dark)', borderBottomColor: 'var(--macro-blue)' }}>
            <div className="flex justify-end items-center mb-6">
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setFilter(filter === 'wins' ? 'none' : 'wins')}
                        className={`text-sm px-3 py-1 rounded-md border transition-colors ${filter === 'wins' ? 'bg-green-900 border-green-500 text-green-200' : 'border-gray-600 text-gray-400 hover:text-green-300 hover:border-green-500'}`}
                    >
                        Ver Victorias Smart
                    </button>
                    <button 
                        onClick={() => setFilter(filter === 'misses' ? 'none' : 'misses')}
                        className={`text-sm px-3 py-1 rounded-md border transition-colors ${filter === 'misses' ? 'bg-red-900 border-red-500 text-red-200' : 'border-gray-600 text-gray-400 hover:text-red-300 hover:border-red-500'}`}
                    >
                        Ver Fallos AI
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Smart AI Accuracy - Exacta (now fucsia) */}
                <div className="p-4 rounded-lg relative overflow-hidden border shadow" style={{ background: 'var(--macro-white)', borderColor: 'var(--macro-pink)', boxShadow: '0 0 15px rgba(230,0,126,0.08)' }}>
                    <div className="absolute top-2 right-2" style={{ background: 'var(--macro-pink)', color: 'var(--macro-white)', fontSize: 10, fontWeight: 'bold', borderRadius: 999, padding: '2px 8px', display: 'flex', alignItems: 'center' }}>
                        <SparklesIcon className="w-3 h-3 mr-1" /> AI
                    </div>
                    <div className="flex flex-col items-center relative z-10">
                        <span style={{ color: 'var(--macro-pink)', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1 }}>Precisión AI</span>
                        <div className="flex items-baseline mt-2">
                            <span style={{ color: 'var(--macro-pink)', fontSize: 28, fontWeight: 'bold' }}>
                                {stats.smartRate.toFixed(1)}%
                            </span>
                        </div>
                        <span style={{ color: 'var(--macro-blue-dark)', fontSize: 12, marginTop: 4 }}>
                            {stats.smartHits}/{stats.total} dentro
                        </span>
                        <span style={{ color: 'var(--macro-pink)', fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                            Tolerancia: ±5 minutos
                        </span>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 transition-all duration-1000" style={{ width: `${stats.smartRate}%`, background: 'var(--macro-pink)' }}></div>
                </div>

                {/* Smart AI Accuracy - Completa */}
                <div className="p-4 rounded-lg relative overflow-hidden border shadow" style={{ background: 'var(--macro-white)', borderColor: 'var(--macro-blue-dark)', boxShadow: '0 0 15px rgba(0,43,92,0.08)' }}>
                    <div className="absolute top-2 right-2" style={{ background: 'var(--macro-blue-dark)', color: 'var(--macro-white)', fontSize: 10, fontWeight: 'bold', borderRadius: 999, padding: '2px 8px', display: 'flex', alignItems: 'center' }}>
                        <SparklesIcon className="w-3 h-3 mr-1" /> ALL
                    </div>
                    <div className="flex flex-col items-center relative z-10">
                        <span style={{ color: 'var(--macro-blue-dark)', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1 }}>AI Completa</span>
                        <div className="flex items-baseline mt-2">
                            <span style={{ color: 'var(--macro-blue-dark)', fontSize: 28, fontWeight: 'bold' }}>
                                {stats.smartInclusiveRate.toFixed(1)}%
                            </span>
                             {stats.smartInclusiveRate > stats.smartRate && (
                                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 'bold', color: 'var(--macro-pink)', background: 'var(--macro-blue-light)', borderRadius: 4, padding: '2px 8px' }}>
                                    +{ (stats.smartInclusiveRate - stats.smartRate).toFixed(1) }%
                                </span>
                            )}
                        </div>
                        <span style={{ color: 'var(--macro-blue-dark)', fontSize: 12, marginTop: 4 }}>
                            {stats.smartInclusiveHits}/{stats.total} favorables
                        </span>
                        <span style={{ color: 'var(--macro-blue-dark)', fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                            + Casos tempranos
                        </span>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 transition-all duration-1000" style={{ width: `${stats.smartInclusiveRate}%`, background: 'var(--macro-blue-dark)' }}></div>
                </div>
            </div>

            {filter !== 'none' && (
                <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300 relative">
                    <button
                        onClick={() => setFilter('none')}
                        className="absolute top-0 right-0 mt-2 mr-2 text-gray-400 hover:text-red-400 text-lg font-bold focus:outline-none"
                        title="Cerrar"
                        aria-label="Cerrar panel"
                    >
                        ×
                    </button>
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${filter === 'wins' ? 'text-green-400' : 'text-red-400'}`}>
                        {filter === 'wins' ? 'Victorias de Smart AI' : 'Análisis de Fallos Smart AI'}
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead style={{ background: '#102040' }}>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hora Real</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Manual</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-400 uppercase">Smart AI</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-red-400 uppercase">Desvíos</th>
                                </tr>
                            </thead>
                            <tbody style={{ background: '#102040' }} className="divide-y divide-gray-700">
                                {displayedItems.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay registros para este filtro.</td></tr>
                                ) : (
                                    displayedItems.map(item => (
                                        <tr key={item.id} style={{ cursor: 'pointer' }} className="hover:bg-blue-900/30">
                                            <td className="px-4 py-3 text-sm text-white font-medium">
                                                {item.date}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-yellow-300 font-mono font-bold">{item.real}</td>
                                            <td className={`px-4 py-3 text-sm font-mono ${item.manual.hit ? 'text-green-400' : 'text-red-400'}`}>
                                                {item.manual.range}
                                            </td>
                                            <td className={`px-4 py-3 text-sm font-mono ${item.smart.hit ? 'text-green-400 font-bold' : (() => {
                                                const [, endTime] = item.smart.range.split(' - ');
                                                if (endTime) {
                                                    const realMinutes = timeToMinutes(item.real);
                                                    const endMinutes = timeToMinutes(endTime);
                                                    return realMinutes > endMinutes ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold';
                                                }
                                                return 'text-red-400 font-bold';
                                            })()}`}>
                                                {item.smart.range}
                                                {item.smart.adjustment > 0 && (
                                                    <span className="ml-1 text-[10px] text-cyan-400 font-normal block">
                                                        (+{item.smart.adjustment}m)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono">
                                                {(() => {
                                                    const [startTime, endTime] = item.smart.range.split(' - ');
                                                    if (!startTime || !endTime) return <span className="text-gray-400">N/A</span>;
                                                    
                                                    const realMinutes = timeToMinutes(item.real);
                                                    const startMinutes = timeToMinutes(startTime);
                                                    const endMinutes = timeToMinutes(endTime);
                                                    
                                                    if (realMinutes >= startMinutes && realMinutes <= endMinutes) {
                                                        return <span className="text-green-400 font-bold">0</span>;
                                                    } else if (realMinutes < startMinutes) {
                                                        return <span className="text-yellow-400 font-bold">-{startMinutes - realMinutes}</span>;
                                                    } else {
                                                        return <span className="text-red-400 font-bold">+{realMinutes - endMinutes}</span>;
                                                    }
                                                })()} 
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
