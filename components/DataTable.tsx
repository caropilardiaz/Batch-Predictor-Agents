
import React, { useMemo, useState } from 'react';
import type { BatchData } from '../types';
import { CheckIcon, XIcon, SparklesIcon, MailIcon } from './icons';
import { calculateSmartEstimation, checkAccuracy, parseManualRange } from '../utils/estimationLogic';
import { timeToMinutes } from '../utils/time';
import { EmailPreviewModal } from './EmailPreviewModal';

interface DataTableProps {
  data: BatchData[];
  onSelectJob: (id: number) => void;
  selectedJobId: number | null;
  modelEstimations: Record<number, string>;
}

const getEspecialityColor = (especial: string) => {
    switch (especial.toLowerCase()) {
        case 'pos-feriado': return 'bg-yellow-600 text-yellow-100';
        case 'preferiado': return 'bg-orange-600 text-orange-100';
        case '1er hábil': return 'bg-blue-600 text-blue-100';
        default: return 'bg-gray-600 text-gray-200';
    }
}

const formatPedidoTiempo = (minutes?: number) => {
    if (!minutes) return "0:00:00";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}:00`;
};

const calculateDeviation = (horaReal: string, range: string) => {
    if (range === 'N/A') return { deviation: 0, status: 'unknown' };
    
    const [startTime, endTime] = range.split(' - ');
    if (!startTime || !endTime) return { deviation: 0, status: 'unknown' };
    
    const realMinutes = timeToMinutes(horaReal);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (realMinutes >= startMinutes && realMinutes <= endMinutes) {
        return { deviation: 0, status: 'hit' }; // Verde - acierto
    } else if (realMinutes < startMinutes) {
        return { deviation: startMinutes - realMinutes, status: 'below' }; // Amarillo - por debajo
    } else {
        return { deviation: realMinutes - endMinutes, status: 'above' }; // Rojo - por encima
    }
};

export const DataTable: React.FC<DataTableProps> = ({ data, onSelectJob, selectedJobId, modelEstimations }) => {
  const [checkedId, setCheckedId] = useState<number | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const smartData = useMemo(() => {
      return data.map(job => {
          const result = calculateSmartEstimation(job, data, 0);
          const range = result.finalPrediction ? `${result.finalPrediction.start} - ${result.finalPrediction.end}` : 'N/A';
          const isHit = result.finalPrediction ? checkAccuracy(result.finalPrediction, job.horaReal) : false;
          return { id: job.id, range, isHit };
      });
  }, [data]);

  const getSmartInfo = (id: number) => smartData.find(s => s.id === id);

  const handleCheckboxChange = (id: number) => {
      if (checkedId === id) {
          setCheckedId(null);
          onSelectJob(-1); // Deselect in main app if possible or just ignore
      } else {
          setCheckedId(id);
          onSelectJob(id); // Update the visual agent
      }
  };

  const selectedDataForEmail = data.find(d => d.id === checkedId);

  return (
    <>
        <div className="rounded-lg shadow-xl overflow-hidden relative" style={{ background: 'var(--macro-blue-dark)' }}>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center" style={{ background: 'var(--macro-blue-dark)' }}>
                <div>
                    <h2 className="text-xl font-bold text-white">Datos Históricos de Procesos Batch</h2>
                    <p className="text-gray-400 text-sm">Seleccione una casilla para simular la notificación.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {/* Powered by IT Patagonia © 2025 moved to footer */}
                    {checkedId && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button 
                                onClick={() => setShowEmailModal(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg font-bold border border-blue-400 transition-all transform hover:scale-105"
                            >
                                <MailIcon className="w-4 h-4" />
                                Generar Correo Supervisor
                            </button>
                        </div>
                    )}
                </div>
            </div>
      
            <div className="overflow-x-auto" style={{ background: 'var(--macro-blue-dark)' }}>
                <table className="min-w-full divide-y divide-gray-700">
                    <thead style={{ background: 'var(--macro-blue-dark)' }}>
                        <tr>
                            <th scope="col" className="px-4 py-3 text-center w-12">
                                 <span className="sr-only">Selección</span>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Característica</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Débitos</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pedido Tiempo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Hora Sin Demora</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Hora Real</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Est. Manual</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider bg-blue-900/20 border-l border-blue-800/50">
                                <div className="flex items-center gap-1"><SparklesIcon className="w-3 h-3"/> Agente de Rango</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider bg-blue-900/20 border-r border-blue-800/50">
                                <div className="flex items-center gap-1">Desvíos (min)</div>
                            </th>
                        </tr>
                    </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {data.map((job) => {
              const smartInfo = getSmartInfo(job.id);
              const isChecked = checkedId === job.id;
              
              const manualRange = parseManualRange(job.estimacion);
              // Si hay rango manual y NO acertó, lo marcamos como fallo (true)
              const isManualMiss = manualRange ? !checkAccuracy(manualRange, job.horaReal) : false;

              return (
                            <tr 
                                key={job.id} 
                                className={`transition-colors duration-200 cursor-pointer ${isChecked ? 'bg-blue-900/30 border-l-4 border-blue-500' : 'hover:bg-gray-700/50'}`}
                                onClick={() => handleCheckboxChange(job.id)}
                            >
                <td className="px-4 py-4 whitespace-nowrap text-center">
                    <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}} // Handled by row click
                        className="w-5 h-5 rounded border-gray-500 text-blue-500 focus:ring-blue-500 bg-gray-700 cursor-pointer"
                    />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{job.fechaReal}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getEspecialityColor(job.especial)}`}>{job.especial}</span>
                        <span className="text-gray-400">{job.dia}</span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    {job.debitos.toLocaleString('es-ES')}
                </td>

                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${job.adjustmentMinutes ? 'text-cyan-300 font-bold' : 'text-gray-500'}`}> 
                                    {formatPedidoTiempo(job.adjustmentMinutes)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono font-bold">
                                    {job.horaSinDemora ? job.horaSinDemora.replace(/\s*PM$/i, '') + ' pm' : ''}
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono font-bold">
                                    <div>
                                        {job.horaReal ? (
                                            <>
                                                {job.horaReal.replace(/\s*día siguiente\s*AM/i, '').trim()}
                                                <span style={{ fontSize: '0.8em', color: '#bbb', marginLeft: 2 }}> am</span>
                                            </>
                                        ) : ''}
                                        <br />
                                        <span style={{ fontSize: '0.7em', color: '#888', fontStyle: 'italic' }}>día siguiente</span>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${isManualMiss ? 'text-red-400 font-bold' : 'text-yellow-300'}`}> 
                                        {job.estimacion}
                                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono border-l border-gray-700 bg-gray-800/50">
                    <div className="flex items-center space-x-2">
                        <span className={`${smartInfo?.isHit ? 'text-green-400 font-bold' : (() => {
                            if (smartInfo?.range && smartInfo.range !== 'N/A') {
                                const [, endTime] = smartInfo.range.split(' - ');
                                if (endTime) {
                                    const realMinutes = timeToMinutes(job.horaReal);
                                    const endMinutes = timeToMinutes(endTime);
                                    return realMinutes > endMinutes ? 'text-red-400 font-bold' : 'text-blue-300';
                                }
                            }
                            return 'text-blue-300';
                        })()}`}>
                            {smartInfo?.range}
                        </span>
                        {smartInfo?.isHit ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                        ) : (
                            <XIcon className="w-4 h-4 text-gray-600 opacity-50" />
                        )}
                    </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono border-r border-gray-700 bg-gray-800/50">
                    {(() => {
                        const devInfo = calculateDeviation(job.horaReal, smartInfo?.range || 'N/A');
                        const colorClass = devInfo.status === 'hit' ? 'text-green-400 font-bold' : 
                                          devInfo.status === 'below' ? 'text-yellow-400 font-bold' :
                                          devInfo.status === 'above' ? 'text-red-400 font-bold' : 
                                          'text-gray-400';
                        return (
                            <span className={colorClass}>
                                {devInfo.status === 'hit' ? '0' : 
                                 devInfo.status === 'unknown' ? 'N/A' :
                                 `${devInfo.status === 'below' ? '-' : '+'}${devInfo.deviation}`}
                            </span>
                        );
                    })()} 
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>

    {showEmailModal && selectedDataForEmail && (
        <EmailPreviewModal 
            job={selectedDataForEmail} 
            allData={data} 
            onClose={() => setShowEmailModal(false)} 
        />
    )}
    </>
  );
};
