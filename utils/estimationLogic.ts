
import type { BatchData, SimilarDay } from '../types';
import { timeToMinutes, minutesToTime, roundToNearest5 } from './time';

export interface EstimationResult {
  pointEstimateMinutes: number;
  volumeAdjustment: number;
  baseTimeMinutes: number;
  bestCandidate: SimilarDay | null;
  strategyUsed: string;
  finalPrediction: {
    start: string;
    end: string;
  } | null;
  // Fields for Range Model
  smartDetails?: {
    neighbors: SimilarDay[];
    averageDelay: number;
    confidenceScore: string; // "High", "Medium", "Low"
    dynamicRangeWidth: number;
    safetyBias: number;
    specialAdjustments?: string[]; // To explain the new rules
    skewInfo?: {
        skewVal: number;
        description: string;
        leftOffset: number;
        rightOffset: number;
    }
  }
}

/**
 * Helper to calculate Median
 */
const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
        return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
};



/**
 * DEPRECATED: Old "Hernan" Heuristic Logic.
 */
export const findBestCandidateLegacy = (target: BatchData, history: BatchData[]): { candidate: SimilarDay | null, strategy: string } => {
  const pool = history.filter(h => h.id !== target.id && (h.debitos + h.creditos) > 0);

  const sortByVolume = (candidates: BatchData[]) => {
    return candidates.map(job => ({
      ...job,
      debitDifference: Math.abs(job.debitos - target.debitos),
    })).sort((a, b) => a.debitDifference - b.debitDifference);
  };

  const strictMatches = pool.filter(h => 
    h.especial.toLowerCase() === target.especial.toLowerCase() && 
    h.dia === target.dia
  );
  
  if (strictMatches.length > 0) {
    return { candidate: sortByVolume(strictMatches)[0], strategy: 'Legado: Estricta' };
  }

  return { candidate: null, strategy: 'Sin Datos' };
};

export const calculateEstimationLegacy = (targetJob: BatchData, historicalData: BatchData[], manualExtraTime: number = 0): EstimationResult => {
    const { candidate: bestCandidate, strategy } = findBestCandidateLegacy(targetJob, historicalData);

    if (!bestCandidate) {
        return {
            pointEstimateMinutes: 0,
            volumeAdjustment: 0,
            baseTimeMinutes: 0,
            bestCandidate: null,
            strategyUsed: 'None',
            finalPrediction: null
        };
    }

    const debitDiff = targetJob.debitos - bestCandidate.debitos;
    const rawAdjustment = (debitDiff / 100000) * 20.0;
    const roundedAdjustment = Math.round(rawAdjustment / 5) * 5;

    const baseTime = timeToMinutes(bestCandidate.horaSinDemora);
    const prelimMinutes = baseTime + roundedAdjustment + manualExtraTime;
    const centerPoint = roundToNearest5(prelimMinutes);

    const finalStartMinutes = centerPoint - 15;
    const finalEndMinutes = centerPoint + 15;
    
    return {
        pointEstimateMinutes: centerPoint,
        volumeAdjustment: roundedAdjustment,
        baseTimeMinutes: baseTime,
        bestCandidate,
        strategyUsed: strategy,
        finalPrediction: {
            start: minutesToTime(finalStartMinutes),
            end: minutesToTime(finalEndMinutes),
        }
    };
};

/**
 * NEW LOGIC: Concepto de Rango (Range Concept) v6.0 - Asymmetric Precision
 * Keeps 30m total width, but shifts the window based on distribution skew.
 */
export const calculateSmartEstimation = (targetJob: BatchData, historicalData: BatchData[], manualExtraTime: number = 0): EstimationResult => {
    
    const specialRulesApplied: string[] = [];
    const targetSpecialLower = targetJob.especial.toLowerCase();

    // 1. Scoring Candidates
    const pool = historicalData.filter(h => h.id !== targetJob.id);
    
    const scoredCandidates = pool.map(job => {
        let score = 0;
        if (job.especial.toLowerCase() === targetSpecialLower) score += 50;
        
        const volDiff = Math.abs(job.debitos - targetJob.debitos);
        if (volDiff < 50000) score += 40;
        else if (volDiff < 100000) score += 20;
        else if (volDiff < 200000) score += 5;
        else score -= 10;

        if (job.dia === targetJob.dia) score += 10;

        return { ...job, score, debitDifference: volDiff, includedInCalc: true };
    }).sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) return calculateEstimationLegacy(targetJob, historicalData, manualExtraTime);

    // --- DYNAMIC CLUSTERING ---
    const bestScore = scoredCandidates[0].score;
    let selectedNeighbors: typeof scoredCandidates = [];

    const relativeThreshold = bestScore * 0.75;
    selectedNeighbors = scoredCandidates.filter(c => c.score >= relativeThreshold || c.score > 80);

    if (selectedNeighbors.length < 3) {
        selectedNeighbors = scoredCandidates.slice(0, 3);
        specialRulesApplied.push('Cluster Extendido');
    }
    if (selectedNeighbors.length > 12) {
        selectedNeighbors = selectedNeighbors.slice(0, 12);
    }

    // 2. Calculate Volatility & Median Drift
    const neighborsWithDrift = selectedNeighbors.map(n => {
        const real = timeToMinutes(n.horaReal);
        const noDelay = timeToMinutes(n.horaSinDemora);
        let d = real - noDelay;
        if (d < -1000) d += 1440; 
        return { ...n, drift: d };
    });

    const drifts = neighborsWithDrift.map(n => n.drift);
    const meanDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
    const variance = drifts.reduce((a, b) => a + Math.pow(b - meanDrift, 2), 0) / drifts.length;
    const stdDev = Math.sqrt(variance);

    // Filter Outliers for Base Calculation
    const validDrifts: number[] = [];
    const processedNeighbors = neighborsWithDrift.map(n => {
        const threshold = Math.max(stdDev * 1.5, 15); 
        const isOutlier = Math.abs(n.drift - meanDrift) > threshold;
        if (!isOutlier) {
            validDrifts.push(n.drift);
        }
        return { ...n, includedInCalc: !isOutlier };
    });

    let predictedDrift = calculateMedian(validDrifts);
    
    // Damping logic
    if (predictedDrift > 15 && stdDev > 20) {
        predictedDrift = predictedDrift * 0.7; 
        specialRulesApplied.push('Filtro Ruido');
    }

    // 3. Base Time
    let targetNoDelay = 0;
    if (!targetJob.horaSinDemora || targetJob.horaSinDemora === 'N/A' || targetJob.horaSinDemora === '') {
         const validNeighbors = processedNeighbors.filter(n => n.includedInCalc);
         const sumBase = validNeighbors.reduce((acc, n) => acc + timeToMinutes(n.horaSinDemora), 0);
         targetNoDelay = sumBase / (validNeighbors.length || 1);
    } else {
         targetNoDelay = timeToMinutes(targetJob.horaSinDemora);
    }
    
    // 4. Volume Adjustment
    const validCount = validDrifts.length;
    const avgNeighborDebits = processedNeighbors.filter(n => n.includedInCalc).reduce((sum, n) => sum + n.debitos, 0) / (validCount || 1);
    let volumeDiff = targetJob.debitos - avgNeighborDebits;
    let volumeAdjustment = (volumeDiff / 100000) * 8; 

    const efficiencyBias = -5;
    
    // 5. Center Point Calculation
    let predictedMinutes = targetNoDelay + predictedDrift + volumeAdjustment + efficiencyBias + manualExtraTime;
    const centerPoint = roundToNearest5(predictedMinutes);

    // --- ASYMMETRIC 30 MIN INTERVAL ---
    // Analyze Skew: Compare Mean vs Median of Valid Drifts.
    // If Mean > Median, it implies a "Right Tail" (Late outliers). We shift the 30m window to the right.
    const validMeanDrift = validDrifts.length > 0 ? validDrifts.reduce((a, b) => a + b, 0) / validDrifts.length : 0;
    const skew = validMeanDrift - predictedDrift;

    // Base: Symmetric 30m (-15 / +15)
    let rangeStartOffset = 15;
    let rangeEndOffset = 15;
    let skewDescription = "Simétrico";

    // Skew Logic: Shift the window while keeping Total Width = 30
    if (skew > 2) {
        // Strong tendency to be late -> Shift Window Right relative to Center
        // Example: Center is 02:00. Instead of 01:45-02:15, use 01:50-02:20 (-10/+20)
        rangeStartOffset = 10;
        rangeEndOffset = 20;
        skewDescription = "Asimétrico (Cola Derecha)";
        specialRulesApplied.push('Asimetría: +Late Risk');
    } else if (skew < -2) {
        // Tendency to be early/stable -> Shift Window Left relative to Center
        rangeStartOffset = 20;
        rangeEndOffset = 10;
        skewDescription = "Asimétrico (Cola Izquierda)";
        specialRulesApplied.push('Asimetría: +Early Bias');
    }

    const totalWidth = rangeEndOffset + rangeStartOffset; // Always 30

    const rangeStart = centerPoint - rangeStartOffset;
    const rangeEnd = centerPoint + rangeEndOffset;
    
    specialRulesApplied.push('Rango Fijo (30m)');

    return {
        pointEstimateMinutes: centerPoint,
        volumeAdjustment: Math.round(volumeAdjustment),
        baseTimeMinutes: Math.round(targetNoDelay),
        bestCandidate: processedNeighbors[0],
        strategyUsed: `Eficiencia Asimétrica`,
        finalPrediction: {
            start: minutesToTime(rangeStart),
            end: minutesToTime(rangeEnd),
        },
        smartDetails: {
            neighbors: processedNeighbors,
            averageDelay: Math.round(predictedDrift),
            confidenceScore: stdDev < 15 ? 'Alta' : 'Moderada',
            dynamicRangeWidth: totalWidth,
            safetyBias: 0, // Not used in this logic
            specialAdjustments: specialRulesApplied,
            skewInfo: {
                skewVal: parseFloat(skew.toFixed(2)),
                description: skewDescription,
                leftOffset: rangeStartOffset,
                rightOffset: rangeEndOffset
            }
        }
    };
};

export const findSimilarDays = (target: BatchData, history: BatchData[]): SimilarDay[] => {
   return history
    .filter(job => job.id !== target.id && job.especial === target.especial)
    .map(job => ({...job, debitDifference: Math.abs(job.debitos - target.debitos)}))
    .sort((a, b) => a.debitDifference - b.debitDifference)
    .slice(0, 5); 
}

export const checkAccuracy = (prediction: { start: string, end: string }, actualTime: string): boolean => {
    if (!actualTime || actualTime === 'N/A' || actualTime === '') return false;

    const start = timeToMinutes(prediction.start);
    const end = timeToMinutes(prediction.end);
    const actual = timeToMinutes(actualTime);
    
    const GRACE_PERIOD = 5; // AI tolerance
    
    let adjStart = start;
    let adjEnd = end;
    let adjActual = actual;

    if (adjEnd < adjStart) {
        adjEnd += 1440;
    }
    if (adjActual < adjStart - 180) { 
         adjActual += 1440;
    }
    else if (adjActual > adjEnd + 180 && adjStart < 300) { 
        adjActual -= 1440;
    }

    return adjActual >= (adjStart - GRACE_PERIOD) && adjActual <= (adjEnd + GRACE_PERIOD);
};

export const checkManualAccuracy = (prediction: { start: string, end: string }, actualTime: string): boolean => {
    if (!actualTime || actualTime === 'N/A' || actualTime === '') return false;

    const start = timeToMinutes(prediction.start);
    const end = timeToMinutes(prediction.end);
    const actual = timeToMinutes(actualTime);
    
    const MANUAL_GRACE_PERIOD = 0; // No tolerance for manual - must be exact
    
    let adjStart = start;
    let adjEnd = end;
    let adjActual = actual;

    if (adjEnd < adjStart) {
        adjEnd += 1440;
    }
    if (adjActual < adjStart - 180) { 
         adjActual += 1440;
    }
    else if (adjActual > adjEnd + 180 && adjStart < 300) { 
        adjActual -= 1440;
    }

    return adjActual >= (adjStart - MANUAL_GRACE_PERIOD) && adjActual <= (adjEnd + MANUAL_GRACE_PERIOD);
};

export const checkAIWithEarlyAccuracy = (prediction: { start: string, end: string }, actualTime: string): boolean => {
    if (!actualTime || actualTime === 'N/A' || actualTime === '') return false;

    const start = timeToMinutes(prediction.start);
    const end = timeToMinutes(prediction.end);
    const actual = timeToMinutes(actualTime);
    
    const GRACE_PERIOD = 5; // Tolerance only for lower limit
    
    let adjStart = start;
    let adjEnd = end;
    let adjActual = actual;

    if (adjEnd < adjStart) {
        adjEnd += 1440;
    }
    if (adjActual < adjStart - 180) { 
         adjActual += 1440;
    }
    else if (adjActual > adjEnd + 180 && adjStart < 300) { 
        adjActual -= 1440;
    }

    // Strict on upper limit (no positive deviations allowed)
    // Tolerant on lower limit (±5 min tolerance for early cases)
    return adjActual >= (adjStart - GRACE_PERIOD) && adjActual <= adjEnd;
};

export const parseManualRange = (rangeStr: string): { start: string, end: string } | null => {
    if (!rangeStr || rangeStr === 'N/A') return null;
    const parts = rangeStr.split('-').map(s => s.trim());
    if (parts.length !== 2) return null;
    return { start: parts[0], end: parts[1] };
};
