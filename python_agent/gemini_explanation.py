
import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env.local si existe
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "PLACEHOLDER_API_KEY":
    print("[AVISO] No se encontró una API Key válida de Gemini. La explicación IA estará deshabilitada.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

def generate_explanation(params: dict) -> str:
    targetJob = params.get("targetJob")
    adjustments = params.get("adjustments")
    pointEstimate = params.get("pointEstimate")
    finalPrediction = params.get("finalPrediction")
    smartDetails = params.get("smartDetails")

    neighbors = smartDetails.get("neighbors", []) if smartDetails else []
    neighborsSummary = "\n".join([
        f"- {n.get('fechaReal')} ({n.get('especial')}): Drift {'+' if n.get('drift', 0) > 0 else ''}{n.get('drift', 0)}min {'(IGNORADO - Outlier)' if n.get('includedInCalc') is False else ''}"
        for n in neighbors[:5]
    ]) if neighbors else ""

    if not GEMINI_API_KEY or GEMINI_API_KEY == "PLACEHOLDER_API_KEY":
        return "La explicación IA está deshabilitada. Configura una API Key válida de Gemini en .env.local."

    prompt = f'''
Eres el "Analista Smart AI v3.0", un modelo avanzado de predicción robusta de horarios.

**Tu Objetivo:**
Explicar claramente la lógica detrás de la estimación, enfocándote en la evidencia estadística y en cualquier intervención manual crítica.

**Contexto del Análisis:**
- Fecha Objetivo: {targetJob.get('fechaReal')} ({targetJob.get('especial')}).
- Volumen: {targetJob.get('debitos'):,} débitos.

**Factores de Decisión:**
1. **Base Estadística:**
   - El cluster de vecinos (Weighted KNN) sugiere un retraso promedio de: {smartDetails.get('averageDelay') if smartDetails else ''} min.
   - Corrección por Volumen: {adjustments.get('volume') if adjustments else ''} min.

2. **Factores Externos (CRÍTICO):**
   - Ajuste Manual / P6: **{adjustments.get('extra') if adjustments else ''} minutos**. 
   (Si este valor es mayor a 0, significa que el operador reportó una demora externa. DEBES mencionar esto como la razón principal del desplazamiento horario).

**Resultado Final:**
- Estimación: {finalPrediction.get('start')} - {finalPrediction.get('end')}

**Instrucciones de Explicación:**
1. Si hay un Ajuste Manual > 0: Empieza diciendo "He desplazado la predicción estadística en {adjustments.get('extra') if adjustments else ''} minutos debido al reporte manual de demora externa (P6)...".
2. Si NO hay ajuste manual: Explica brevemente la consistencia de los vecinos históricos.
3. Sé conciso y profesional.

**Formato:**
Un solo párrafo explicativo en español técnico.
'''

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt, generation_config={"temperature": 0.5})
        return response.text.strip() if hasattr(response, 'text') and response.text else "No se pudo generar una explicación."
    except Exception as e:
        print(f"Error llamando a Gemini: {e}")
        return f"Ocurrió un error al intentar generar la explicación con la IA: {e}"
