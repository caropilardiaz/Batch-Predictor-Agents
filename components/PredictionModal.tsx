
import React, { useState } from 'react';
import type { BatchData } from '../types';
import { SparklesIcon, XIcon } from './icons';

interface PredictionModalProps {
    onClose: () => void;
    onSubmit: (data: BatchData) => void;
}

export const PredictionModal: React.FC<PredictionModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        debitos: '',
        creditos: '1',
        especial: 'Normal',
        dia: 'Lunes',
        inicioLote: '20:00'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Create a BatchData object for a future event
        // We use mock values for fields that don't exist yet (horaReal, etc)
        const newJob: BatchData = {
            id: 9999, // Temp ID
            inicioLote: formData.inicioLote,
            especial: formData.especial,
            dia: formData.dia as any,
            fechaReal: "Predicción Futura", // Label
            horaReal: "", // Unknown
            horaSinDemora: "", // Unknown, will be inferred
            debitos: parseInt(formData.debitos) || 0,
            creditos: parseInt(formData.creditos) || 0,
            estimacion: "Pendiente"
        };
        
        onSubmit(newJob);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm p-4" style={{ background: 'rgba(0,43,92,0.85)' }}>
            <div style={{ background: 'var(--macro-white)', borderRadius: 18, boxShadow: '0 8px 32px 0 rgba(0,43,92,0.18)', border: '2px solid var(--macro-blue)' }} className="w-full max-w-md">
                <div className="p-6 flex justify-between items-center border-b" style={{ borderBottom: '1px solid var(--macro-blue-light)' }}>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6" style={{ color: 'var(--macro-blue)' }} />
                        <h2 className="text-xl font-bold" style={{ color: 'var(--macro-blue-dark)' }}>Nueva Predicción Smart AI</h2>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--macro-blue-dark)' }} className="hover:opacity-80">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--macro-blue-dark)' }}>Volumen de Débitos (Estimado)</label>
                        <input 
                            type="number" 
                            required
                            className="w-full rounded-lg p-3 text-lg font-mono outline-none border"
                            style={{ background: 'var(--macro-blue-light)', color: 'var(--macro-blue-dark)', borderColor: 'var(--macro-blue)', fontWeight: 600 }}
                            placeholder="Ej: 500000"
                            value={formData.debitos}
                            onChange={e => setFormData({...formData, debitos: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium mb-1" style={{ color: 'var(--macro-blue-dark)' }}>Día de la Semana</label>
                             <select 
                                className="w-full rounded-lg p-3 outline-none border"
                                style={{ background: 'var(--macro-blue-light)', color: 'var(--macro-blue-dark)', borderColor: 'var(--macro-blue)', fontWeight: 600 }}
                                value={formData.dia}
                                onChange={e => setFormData({...formData, dia: e.target.value})}
                             >
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1" style={{ color: 'var(--macro-blue-dark)' }}>Tipo de Día</label>
                             <select 
                                className="w-full rounded-lg p-3 outline-none border"
                                style={{ background: 'var(--macro-blue-light)', color: 'var(--macro-blue-dark)', borderColor: 'var(--macro-blue)', fontWeight: 600 }}
                                value={formData.especial}
                                onChange={e => setFormData({...formData, especial: e.target.value})}
                             >
                                {['Normal', 'Pre-Feriado', 'Pos-Feriado', '1er Hábil', '2do Hábil', '5to Hábil', 'Último Hábil', 'Ante Último Háb', 'Día 10', 'Día 26'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                             </select>
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full font-bold py-3 rounded-lg shadow-lg transform transition hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(90deg, var(--macro-blue) 0%, var(--macro-blue-light) 100%)', color: 'var(--macro-white)' }}
                    >
                        Calcular Proyección
                    </button>
                </form>
            </div>
        </div>
    );
};
