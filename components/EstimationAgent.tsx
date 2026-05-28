
import React, { useState, useMemo, useEffect } from 'react';
import type { BatchData } from '../types';
import { minutesToTime } from '../utils/time';
import { calculateSmartEstimation, findSimilarDays } from '../utils/estimationLogic';
import { generateExplanation, parseP6Email } from '../services/geminiService';
import { CalendarIcon, ChartIcon, CheckIcon, ClockIcon, SparklesIcon, XIcon, MailIcon } from './icons';

interface EstimationAgentProps {
  historicalData: BatchData[];
  targetJob: BatchData | null;
  onClearTarget: () => void;
  onEstimationUpdate: (jobId: number, estimation: string) => void;
  isFuturePrediction?: boolean;
}

export const EstimationAgent: React.FC<EstimationAgentProps> = ({ 
    historicalData, 
    targetJob, 
    onClearTarget, 
    onEstimationUpdate,
    isFuturePrediction = false
}) => {
    const [extraTime, setExtraTime] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);
    
    // Email Parsing State
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [emailText, setEmailText] = useState('');
    const [isParsingEmail, setIsParsingEmail] = useState(false);

    useEffect(() => {
      setExtraTime(0);
      setExplanation('');
      setIsExplaining(false);
      setShowEmailInput(false);
      setEmailText('');
    }, [targetJob]);

    const similarDays = useMemo(() => {
        if (!targetJob) return [];
        return findSimilarDays(targetJob, historicalData);
    }, [targetJob, historicalData]);

    const estimationResult = useMemo(() => {
        if (!targetJob) return null;
        return calculateSmartEstimation(targetJob, historicalData, extraTime);
    }, [targetJob, historicalData, extraTime]);

    const { bestCandidate, volumeAdjustment, pointEstimateMinutes, finalPrediction, strategyUsed, smartDetails, baseTimeMinutes } = estimationResult || {};

    // Visual Equation Variables for Concepto de Rango
    const driftMinutes = smartDetails ? smartDetails.averageDelay : 0;
    const rangeWidth = smartDetails ? smartDetails.dynamicRangeWidth : 30;
    // Calculate visual percentage for the center point based on offsets
    const leftOffset = smartDetails?.skewInfo?.leftOffset || 15;
    const totalW = smartDetails?.dynamicRangeWidth || 30;
    const centerPercentage = (leftOffset / totalW) * 100;
    const skewDescription = smartDetails?.skewInfo?.description || "Simétrico";

    useEffect(() => {
        if (targetJob && finalPrediction) {
            onEstimationUpdate(targetJob.id, `${finalPrediction.start} - ${finalPrediction.end}`);
        }
    }, [targetJob, finalPrediction, onEstimationUpdate]);

    const handleExplain = async () => {
      if (!targetJob || !bestCandidate || !finalPrediction || pointEstimateMinutes === undefined) return;
      setIsExplaining(true);
      setExplanation('');
      try {
        const result = await generateExplanation({
          targetJob,
          similarDays,
          bestCandidate,
          adjustments: { volume: volumeAdjustment || 0, extra: extraTime },
          pointEstimate: minutesToTime(pointEstimateMinutes),
          finalPrediction,
          smartDetails: smartDetails 
        });
        setExplanation(result);
      } catch (error) {
        setExplanation("Error al generar la explicación.");
      } finally {
        setIsExplaining(false);
      }
    };

    const handleParseEmail = async () => {
        if (!emailText) return;
        setIsParsingEmail(true);
        try {
            const minutes = await parseP6Email(emailText);
            if (minutes > 0) {
                setExtraTime(minutes);
                setShowEmailInput(false); 
                setEmailText('');
            }
        } catch (error) {
            console.error("Error parsing email", error);
        } finally {
            setIsParsingEmail(false);
        }
    };

    if (!targetJob) {
        return (
            <div style={{ background: 'var(--macro-blue-dark)', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 24px 0 rgba(0,43,92,0.10)', border: '2px solid var(--macro-blue)', minHeight: 300 }} className="flex flex-col items-center justify-center h-full">
                <div style={{ background: 'var(--macro-blue-light)', borderRadius: 999, padding: 16, marginBottom: 16 }}>
                    <SparklesIcon className="w-16 h-16" style={{ color: 'var(--macro-blue)' }} />
                </div>
                <h2 style={{ color: 'var(--macro-blue)', fontWeight: 700, fontSize: 28 }}>Agente de Rango Dinámico</h2>
                <p style={{ color: 'var(--macro-white)', marginTop: 8, maxWidth: 400 }}>
                    Selecciona un día histórico o inicia una <strong>Nueva Predicción</strong>.<br/>
                    El sistema mide la estabilidad de los horarios históricos para ajustar la predicción.
                </p>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--macro-blue-dark)', borderRadius: 16, boxShadow: '0 4px 24px 0 rgba(0,43,92,0.10)', border: '2px solid var(--macro-blue)', position: 'relative' }}>
            {/* Header */}
            <div style={{ padding: 24, borderBottom: '1px solid var(--macro-blue-light)', borderTopLeftRadius: 16, borderTopRightRadius: 16, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: 'var(--macro-blue-light)', color: 'var(--macro-blue-dark)', fontSize: 12, padding: '2px 10px', borderRadius: 8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Agente de Rango</span>
                        {isFuturePrediction && <span style={{ background: 'var(--macro-pink)', color: 'var(--macro-white)', fontSize: 12, padding: '2px 10px', borderRadius: 8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Proyección</span>}
                    </div>
                    <h2 style={{ color: 'var(--macro-white)', fontWeight: 700, fontSize: 24, marginTop: 4 }}>{targetJob.fechaReal}</h2>
                </div>
                <button onClick={onClearTarget} style={{ color: 'var(--macro-white)', background: 'transparent', border: 0, borderRadius: 999, padding: 8, cursor: 'pointer' }} title="Cerrar simulación">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            <div style={{ padding: 24 }}>
                {/* Input Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--macro-blue-light)', padding: 16, borderRadius: 12, border: '1px solid var(--macro-blue)', marginBottom: 24 }}>
                    <div style={{ background: 'var(--macro-blue)', padding: 12, borderRadius: 999 }}><CalendarIcon className="w-6 h-6" style={{ color: 'var(--macro-white)' }}/></div>
                    <div>
                        <h3 style={{ fontWeight: 600, color: 'var(--macro-blue-dark)' }}>1. Input: {targetJob.especial}</h3>
                        <p style={{ fontSize: 14, color: 'var(--macro-blue-dark)' }}>
                           Día: {targetJob.dia} | Débitos: <span style={{ fontFamily: 'monospace', color: 'var(--macro-blue)' }}>{targetJob.debitos.toLocaleString('es-ES')}</span>
                        </p>
                    </div>
                </div>
                {finalPrediction ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, paddingTop: 24 }}>
                        <div style={{ padding: 12, borderRadius: 999, background: isFuturePrediction ? 'var(--macro-pink)' : 'var(--macro-blue)' }}>
                            {isFuturePrediction ? <SparklesIcon className="w-6 h-6" style={{ color: 'var(--macro-white)' }}/> : <CheckIcon className="w-6 h-6" style={{ color: 'var(--macro-white)' }}/>} 
                        </div>
                        <div>
                            <h3 style={{ fontWeight: 600, color: 'var(--macro-white)' }}>4. Rango Proyectado</h3>
                            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 2, color: 'var(--macro-blue-light)' }}>
                                {finalPrediction.start} - {finalPrediction.end}
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--macro-blue-light)', marginTop: 4 }}>
                                Intervalo de confianza basado en {strategyUsed}
                                {smartDetails && smartDetails.confidenceScore && (
                                    <span style={{
                                        color: smartDetails.confidenceScore.toLowerCase() === 'alta' ? '#22c55e' : smartDetails.confidenceScore.toLowerCase() === 'moderada' ? '#eab308' : '#ef4444',
                                        fontWeight: 700,
                                        marginLeft: 8
                                    }}>
                                        {smartDetails.confidenceScore.toLowerCase() === 'alta' && '● Alta confianza'}
                                        {smartDetails.confidenceScore.toLowerCase() === 'moderada' && '● Confianza media'}
                                        {smartDetails.confidenceScore.toLowerCase() === 'baja' && '● Baja confianza'}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--macro-pink)' }}>
                        <p>No hay datos suficientes para generar un rango.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
