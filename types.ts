
export interface BatchData {
  id: number;
  inicioLote: string;
  especial: string;
  dia: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  fechaReal: string; // "YYYY-MM-DD"
  horaReal: string; // "HH:mm:ss"
  horaSinDemora: string; // "HH:mm:ss" - New field for "Time without delay"
  debitos: number;
  creditos: number;
  movimientos?: number; // Added to support "Movimientos Aproximados" from PDF
  estimacion: string; // "HH:mm - HH:mm"
  adjustmentMinutes?: number; // Manual adjustment from email/external factors
}

export interface SimilarDay extends BatchData {
    debitDifference: number; // Changed from volumeDifference to track Debits specifically
    drift?: number;
    includedInCalc?: boolean;
}
