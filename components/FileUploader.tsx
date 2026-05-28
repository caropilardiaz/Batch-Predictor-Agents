
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { BatchData } from '../types';
import { ChartIcon } from './icons';

interface FileUploaderProps {
    onDataLoaded: (data: BatchData[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Validate and Map Data
            const mappedData: BatchData[] = jsonData.map((row: any, index: number) => {
                // Try to find fields flexibly (case insensitive or common names)
                const getField = (keys: string[]) => {
                    for (const k of keys) {
                        if (row[k] !== undefined) return row[k];
                        const lowerK = k.toLowerCase();
                        const found = Object.keys(row).find(rk => rk.toLowerCase() === lowerK);
                        if (found) return row[found];
                    }
                    return null;
                };

                const parseDurationOrInt = (val: any): number => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string' && val.includes(':')) {
                        const parts = val.split(':');
                        const h = parseInt(parts[0]) || 0;
                        const m = parseInt(parts[1]) || 0;
                        return h * 60 + m;
                    }
                    return parseInt(val) || 0;
                };

                const debitos = parseInt(getField(['debitos', 'volumen', 'cantidad', 'movimientos']) || '0');
                const fecha = getField(['fecha', 'fechaReal', 'date']) || `N/A-${index}`;
                const horaReal = getField(['horaReal', 'hora', 'fin', 'end']) || '00:00';
                
                const rawAjuste = getField(['ajuste', 'extra', 'mail', 'demora', 'pedido de tiempo', 'pedido tiempo', 'pedidotiempo']);
                const ajuste = parseDurationOrInt(rawAjuste);
                
                // Fallback for horaSinDemora if not present: usually Real - 25min
                let horaSinDemora = getField(['horaSinDemora', 'sinDemora', 'base']);
                if (!horaSinDemora && horaReal && horaReal !== '00:00') {
                    horaSinDemora = horaReal; 
                }

                return {
                    id: 1000 + index, // Temp ID for new data
                    inicioLote: "20:00",
                    especial: getField(['tipo', 'especial', 'type', 'característica']) || 'Normal',
                    dia: getField(['dia', 'day']) || 'Lunes',
                    fechaReal: String(fecha),
                    horaReal: String(horaReal),
                    horaSinDemora: String(horaSinDemora || horaReal),
                    debitos: debitos,
                    creditos: 1, // Default
                    estimacion: getField(['estimacion', 'estimación']) || "N/A", 
                    adjustmentMinutes: ajuste
                } as BatchData;
            });

            if (mappedData.length === 0) {
                throw new Error("No se encontraron datos válidos en el archivo.");
            }

            onDataLoaded(mappedData);
        } catch (err) {
            console.error(err);
            setError("Error al leer el archivo. Columnas sugeridas: Fecha, Tipo, Dia, Debitos, Hora Real, Pedido de Tiempo");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col items-end">
            <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2.5 rounded-lg border border-gray-600 transition-colors text-sm font-medium"
            >
                <ChartIcon className="w-4 h-4 text-green-400" />
                {isLoading ? 'Procesando...' : 'Cargar Excel'}
            </button>
            {error && <span className="text-xs text-red-400 mt-1 absolute top-20 right-8 bg-gray-900 p-2 rounded border border-red-900">{error}</span>}
        </div>
    );
};
