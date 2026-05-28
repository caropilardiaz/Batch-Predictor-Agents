from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

from estimation_logic import calculate_smart_estimation
from gemini_explanation import generate_explanation

app = FastAPI()

@app.post("/estimate/")
async def estimate(request: Request):
    data = await request.json()
    target_job = data.get("target_job")
    historical_data = data.get("historical_data", [])
    manual_extra_time = data.get("manual_extra_time", 0)
    if not target_job or not historical_data:
        return JSONResponse(content={"error": "Missing target_job or historical_data"}, status_code=400)
    result = calculate_smart_estimation(target_job, historical_data, manual_extra_time)

    # Preparar los parámetros para la explicación IA
    explanation_params = {
        "targetJob": target_job,
        "adjustments": {
            "volume": result.get("volumeAdjustment", 0),
            "extra": manual_extra_time
        },
        "pointEstimate": result.get("pointEstimateMinutes"),
        "finalPrediction": result.get("finalPrediction"),
        "smartDetails": result.get("smartDetails")
    }
    explanation = generate_explanation(explanation_params)
    return JSONResponse(content={"result": result, "explanation": explanation})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
