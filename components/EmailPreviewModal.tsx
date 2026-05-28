
import React, { useState } from 'react';
import type { BatchData } from '../types';
import { calculateSmartEstimation } from '../utils/estimationLogic';
import { timeToMinutes, minutesToTime } from '../utils/time';
import { XIcon, CheckIcon, MailIcon } from './icons';

interface EmailPreviewModalProps {
    job: BatchData;
    allData: BatchData[];
    onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ job, allData, onClose }) => {
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Calculate estimation on the fly to get neighbors and details
    const estimation = calculateSmartEstimation(job, allData, job.adjustmentMinutes || 0);
    const { finalPrediction, smartDetails } = estimation;
    
    // Get last 5 historical records relative to this job's date
    const history = allData
        .filter(h => h.id !== job.id && h.fechaReal < job.fechaReal)
        .sort((a, b) => b.fechaReal.localeCompare(a.fechaReal))
        .slice(0, 5);

    const handleSend = () => {
        setIsSending(true);
        setTimeout(() => {
            setIsSending(false);
            setSent(true);
            setTimeout(onClose, 2000);
        }, 1500);
    };

    // Format neighbors for "Fechas Comparativas"
    const comparativeDates = smartDetails?.neighbors
        .slice(0, 3)
        .map(n => {
            const parts = n.fechaReal.split('-');
            return `${parts[2]}/${parts[1]}`;
        })
        .join(' | ');

    // Use movimientos if available, otherwise debitos
    const volumeDisplay = job.movimientos || job.debitos;

    // Helper to match the screenshot date format: "mié 03/12/2025"
    const formatDateForTable = (dateStr: string, day: string) => {
        const [y, m, d] = dateStr.split('-');
        const dayShort = day.substring(0, 3).toLowerCase();
        return `${dayShort} ${d}/${m}/${y}`;
    };

    // --- CHART LOGIC ---
    const chartHistory = [...history].reverse(); // Oldest first
    const chartData = chartHistory.map(h => ({
        label: formatDateForTable(h.fechaReal, h.dia),
        subLabel: h.especial,
        value: timeToMinutes(h.horaReal),
        displayValue: h.horaReal.substring(0, 5)
    }));

    const sloTime = "06:15";
    const sloMinutes = timeToMinutes(sloTime);

    // Chart Dimensions & Scales
    const width = 600;
    const height = 240;
    const padding = { top: 30, right: 60, bottom: 50, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Y Scale (Time)
    // Find min/max time to scale the chart dynamically
    const allTimes = [...chartData.map(d => d.value), sloMinutes];
    // Add some buffer (e.g. +/- 60 mins or fixed range if consistent)
    // For visual consistency with typical Excel charts, let's start Y axis a bit below min value
    const minTime = Math.min(...allTimes) - 60; 
    const maxTime = Math.max(...allTimes) + 30;

    const yScale = (minutes: number) => {
        return height - padding.bottom - ((minutes - minTime) / (maxTime - minTime)) * chartH;
    };

    // X Scale (Distributed)
    const xScale = (index: number) => {
        return padding.left + (index / (Math.max(chartData.length - 1, 1))) * chartW;
    };

    // Generate Path
    const points = chartData.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
    // Simple straight line path (L) or you could use Bezier for smoothing. 
    // Using straight lines for robustness in SVG without libraries.
    const pathD = chartData.length > 0 ? `M ${points.replace(/ /g, ' L ')}` : '';
    
    // SLO Line Y
    const sloY = yScale(sloMinutes);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Simulación Outlook/Gmail */}
                <div className="bg-gray-100 p-4 border-b border-gray-300 flex justify-between items-center text-gray-800">
                    <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-600 w-20 text-right text-xs uppercase">Para:</span>
                            <span className="bg-white px-2 py-1 rounded text-sm font-mono text-gray-800 border border-gray-300 shadow-sm">
                                supervisor@banco.macro.com
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-600 w-20 text-right text-xs uppercase">Asunto:</span>
                            <span className="font-semibold text-gray-900 text-sm">
                                Proyección Horario COBIS - {job.fechaReal}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 ml-4">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body Content - Scrollable */}
                <div className="p-6 overflow-y-auto bg-white text-gray-800 font-sans">
                    
                    {/* TABLE 1: MODELO DE NOTIFICACIÓN (BLUE TABLE) */}
                    <div className="border-2 border-blue-900 mb-8 shadow-sm">
                        <div className="bg-blue-900 text-white font-bold text-center py-2 uppercase text-sm tracking-wider">
                            Proyección Batch Cobis
                        </div>
                        <div className="bg-blue-700 text-white font-semibold text-center py-1 text-sm border-t border-blue-500">
                            día {job.fechaReal}
                        </div>

                        <div className="grid grid-cols-[220px_1fr] text-sm border-t border-blue-900">
                            
                            <div className="bg-blue-100 p-3 font-bold text-blue-900 border-b border-blue-300 flex items-center">
                                Fecha/s Comparativa/s
                            </div>
                            <div className="p-3 border-b border-blue-300 flex items-center bg-white text-gray-700">
                                {comparativeDates || 'N/A'}
                            </div>

                            <div className="bg-blue-100 p-3 font-bold text-blue-900 border-b border-blue-300 flex items-center">
                                Inicio Cadena Batch
                            </div>
                            <div className="p-3 border-b border-blue-300 flex items-center font-bold text-gray-900 bg-white">
                                20:00 hs
                            </div>

                            <div className="bg-blue-100 p-3 font-bold text-blue-900 border-b border-blue-300 flex items-center">
                                Horario Posible Habilitación
                            </div>
                            <div className="p-3 border-b border-blue-300 flex items-center font-bold text-blue-800 text-lg bg-white">
                                {finalPrediction ? finalPrediction.end : 'Calculando...'}
                            </div>

                            <div className="bg-blue-100 p-3 font-bold text-blue-900 border-b border-blue-300 flex items-center">
                                Movimientos Aproximados
                            </div>
                            <div className="p-3 border-b border-blue-300 flex items-center bg-white text-gray-700">
                                {volumeDisplay.toLocaleString('es-ES')}
                            </div>

                            <div className="bg-blue-100 p-3 font-bold text-blue-900 border-b border-blue-300 flex items-center">
                                Rango Estimado
                            </div>
                            <div className="p-3 border-b border-blue-300 flex items-center font-bold bg-yellow-50 text-gray-900">
                                {finalPrediction ? `${finalPrediction.start} - ${finalPrediction.end}` : 'N/A'}
                            </div>

                            <div className="bg-blue-100 p-3 font-bold text-blue-900 flex items-center">
                                Pedido de Tiempo Pasajes (min)
                            </div>
                            <div className="p-3 flex items-center bg-white text-gray-700">
                                {job.adjustmentMinutes && job.adjustmentMinutes > 0 ? `${job.adjustmentMinutes} min` : '0 min (N/A)'}
                            </div>
                        </div>
                    </div>

                    {/* TABLE 2: HISTORIAL (EXCEL STYLE MATCHING IMAGE) */}
                    <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase border-b pb-1">Historial de Ejecuciones</h3>
                    <div className="overflow-hidden border border-gray-400 mb-8">
                        <table className="w-full text-sm border-collapse font-sans">
                            <thead>
                                <tr className="bg-[#4472C4] text-white">
                                    <th className="p-2 border-r border-blue-400 text-center font-semibold w-1/3">Tipo Batch</th>
                                    <th className="p-2 border-r border-blue-400 text-center font-semibold w-1/3">Fecha</th>
                                    <th className="p-2 text-center font-semibold w-1/3 leading-tight">Horario<br/>Habilitación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h, idx) => (
                                    <tr key={h.id} className="bg-white border-b border-gray-300 text-gray-900">
                                        <td className="p-2 border-r border-gray-300 text-center">{h.especial}</td>
                                        <td className="p-2 border-r border-gray-300 text-center">{formatDateForTable(h.fechaReal, h.dia)}</td>
                                        <td className="p-2 text-center">{h.horaReal.substring(0, 5)}</td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-gray-500 italic">No hay historial disponible</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* GRAPH: HISTORICAL CHART (EXCEL STYLE) */}
                    {chartData.length > 1 && (
                        <div className="mb-8 p-2 border border-blue-300 rounded bg-white">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase text-center">Evolución Histórica (vs SLO)</h3>
                            <div className="w-full overflow-x-auto flex justify-center">
                                <svg width={width} height={height} className="bg-white font-sans text-xs">
                                    {/* Grid Lines (Optional - Simplified) */}
                                    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e5e7eb" />
                                    <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#9ca3af" />

                                    {/* SLO Line */}
                                    <line 
                                        x1={padding.left} 
                                        y1={sloY} 
                                        x2={width - padding.right} 
                                        y2={sloY} 
                                        stroke="red" 
                                        strokeWidth="2" 
                                        strokeDasharray="4,4" 
                                    />
                                    <text x={width - padding.right + 5} y={sloY + 4} fill="red" fontWeight="bold" fontSize="10">{sloTime}</text>
                                    <text x={width - padding.right + 5} y={sloY - 8} fill="red" fontSize="8">SLO</text>

                                    {/* Data Line */}
                                    <path d={pathD} fill="none" stroke="#4472C4" strokeWidth="2" />

                                    {/* Points and Labels */}
                                    {chartData.map((d, i) => {
                                        const x = xScale(i);
                                        const y = yScale(d.value);
                                        return (
                                            <g key={i}>
                                                {/* Line down to X axis */}
                                                <line x1={x} y1={y} x2={x} y2={height - padding.bottom} stroke="#e5e7eb" strokeDasharray="2,2" />
                                                
                                                {/* Point */}
                                                <circle cx={x} cy={y} r="3" fill="#4472C4" stroke="white" strokeWidth="1" />
                                                
                                                {/* Value Label (Time) */}
                                                <text 
                                                    x={x} 
                                                    y={y - 10} 
                                                    textAnchor="middle" 
                                                    fill="#0f4c81" 
                                                    fontWeight="bold"
                                                    fontSize="11"
                                                >
                                                    {d.displayValue}
                                                </text>

                                                {/* X Axis Labels */}
                                                <text x={x} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">
                                                    {d.label.split(' ')[0]} {d.label.split(' ')[1]}
                                                </text>
                                                <text x={x} y={height - padding.bottom + 28} textAnchor="middle" fontSize="9" fill="#6b7280">
                                                    {d.subLabel}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Legend / Title (Bottom) */}
                                    <g transform={`translate(${width/2 - 50}, ${height - 5})`}>
                                        <line x1="0" y1="-4" x2="20" y2="-4" stroke="#4472C4" strokeWidth="2" />
                                        <circle cx="10" cy="-4" r="2" fill="#4472C4" />
                                        <text x="25" y="0" fontSize="10" fill="#374151">Horario Habilitación</text>
                                        
                                        <line x1="110" y1="-4" x2="130" y2="-4" stroke="red" strokeWidth="2" strokeDasharray="4,4" />
                                        <text x="135" y="0" fontSize="10" fill="red">SLO</text>
                                    </g>
                                </svg>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 text-[10px] text-gray-400 text-center border-t pt-2">
                        Generado automáticamente | IT Patagonia
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 p-4 border-t border-gray-300 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded text-gray-600 hover:bg-gray-200 font-medium text-sm transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={isSending || sent}
                        className={`flex items-center gap-2 px-6 py-2 rounded font-bold text-sm text-white transition-all shadow-md ${sent ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isSending ? 'Enviando...' : sent ? '¡Enviado!' : 'Enviar Correo'}
                        {sent ? <CheckIcon className="w-4 h-4" /> : <MailIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
