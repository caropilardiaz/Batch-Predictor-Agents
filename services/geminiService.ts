
import { GoogleGenAI } from "@google/genai";
import type { BatchData, SimilarDay } from "../types";

// Assume process.env.API_KEY is configured in the environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Explanation feature will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface ExplanationParams {
  targetJob: BatchData;
  similarDays: SimilarDay[]; 
  bestCandidate: SimilarDay;
  adjustments: { volume: number; extra: number };
  pointEstimate: string;
  finalPrediction: { start: string; end: string };
  smartDetails?: {
    neighbors: SimilarDay[];
    averageDelay: number;
    confidenceScore: string;
    dynamicRangeWidth: number;
    safetyBias?: number;
  };
}

export const generateExplanation = async (params: ExplanationParams): Promise<string> => {
  if (!API_KEY) {
    return "La funcionalidad de explicación con IA está deshabilitada. Por favor, configure una API Key de Gemini.";
  }

  const { targetJob, adjustments, pointEstimate, finalPrediction, smartDetails } = params;

  // Construct a summary of the cluster for the prompt
  const neighborsSummary = smartDetails?.neighbors.slice(0,5).map(n => {
    const driftVal = n.drift ?? 0;
    const outlierStatus = n.includedInCalc === false ? '(IGNORADO - Outlier)' : '';
    return `- ${n.fechaReal} (${n.especial}): Drift ${driftVal > 0 ? '+' : ''}${driftVal}min ${outlierStatus}`;
  }).join('\n');

  const prompt = `
    Eres el "Analista Smart AI v3.0", un modelo avanzado de predicción robusta de horarios.
    
    **Tu Objetivo:**
    Explicar claramente la lógica detrás de la estimación, enfocándote en la evidencia estadística y en cualquier intervención manual crítica.

    **Contexto del Análisis:**
    - Fecha Objetivo: ${targetJob.fechaReal} (${targetJob.especial}).
    - Volumen: ${targetJob.debitos.toLocaleString('es-ES')} débitos.

    **Factores de Decisión:**
    1. **Base Estadística:**
       - El cluster de vecinos (Weighted KNN) sugiere un retraso promedio de: ${smartDetails?.averageDelay} min.
       - Corrección por Volumen: ${adjustments.volume} min.
    
    2. **Factores Externos (CRÍTICO):**
       - Ajuste Manual / P6: **${adjustments.extra} minutos**. 
       (Si este valor es mayor a 0, significa que el operador reportó una demora externa. DEBES mencionar esto como la razón principal del desplazamiento horario).

    **Resultado Final:**
    - Estimación: ${finalPrediction.start} - ${finalPrediction.end}

    **Instrucciones de Explicación:**
    1. Si hay un Ajuste Manual > 0: Empieza diciendo "He desplazado la predicción estadística en ${adjustments.extra} minutos debido al reporte manual de demora externa (P6)...".
    2. Si NO hay ajuste manual: Explica brevemente la consistencia de los vecinos históricos.
    3. Sé conciso y profesional.

    **Formato:**
    Un solo párrafo explicativo en español técnico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }, // Reduce thinking budget for faster UI response
        temperature: 0.5
      }
    });
    return response.text || "No se pudo generar una explicación.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Ocurrió un error al intentar generar la explicación con la IA.";
  }
};

export const parseP6Email = async (emailText: string): Promise<number> => {
    if (!API_KEY || !emailText) return 0;

    const prompt = `
        Analiza el siguiente texto de correo electrónico relacionado con un "Pedido de Tiempo P6" (retraso o tiempo adicional para un proceso batch).
        Identifica la cantidad TOTAL de minutos que se deben agregar a la estimación.
        
        Reglas:
        - Busca frases como "sumar X minutos", "demora de X tiempo", "detener por X horas".
        - Convierte horas a minutos.
        - Si no se menciona ningún tiempo específico, devuelve 0.
        - Tu respuesta debe ser SOLAMENTE un número entero (ej: 30, 45, 0). No incluyas texto.

        Texto del Correo:
        "${emailText}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const text = response.text?.trim();
        const minutes = parseInt(text || '0', 10);
        return isNaN(minutes) ? 0 : minutes;
    } catch (error) {
        console.error("Error parsing email with Gemini:", error);
        return 0;
    }
};
