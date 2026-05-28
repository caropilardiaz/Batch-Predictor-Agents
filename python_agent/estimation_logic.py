
import pandas as pd
import numpy as np
from typing import List, Dict, Any

# Utilidades de tiempo
def time_to_minutes(time_str: str) -> int:
    parts = time_str.split(":")
    hours = int(parts[0])
    minutes = int(parts[1])
    return hours * 60 + minutes

def minutes_to_time(total_minutes: int) -> str:
    hours = total_minutes // 60
    minutes = round(total_minutes % 60)
    return f"{hours:02d}:{minutes:02d}"

def round_to_nearest_5(minutes: float) -> int:
    return int(round(minutes / 5) * 5)

def calculate_median(values: List[float]) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    mid = len(sorted_vals) // 2
    if len(sorted_vals) % 2 != 0:
        return sorted_vals[mid]
    return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2

# Nodo IA principal: estimación inteligente
def calculate_smart_estimation(target_job: Dict[str, Any], historical_data: List[Dict[str, Any]], manual_extra_time: float = 0) -> Dict[str, Any]:
    special_rules_applied = []
    target_special_lower = target_job['especial'].lower()

    # 1. Scoring Candidates
    pool = [h for h in historical_data if h['id'] != target_job['id']]
    scored_candidates = []
    for job in pool:
        score = 0
        if job['especial'].lower() == target_special_lower:
            score += 50
        vol_diff = abs(job['debitos'] - target_job['debitos'])
        if vol_diff < 50000:
            score += 40
        elif vol_diff < 100000:
            score += 20
        elif vol_diff < 200000:
            score += 5
        else:
            score -= 10
        if job['dia'] == target_job['dia']:
            score += 10
        job_copy = job.copy()
        job_copy['score'] = score
        job_copy['debitDifference'] = vol_diff
        job_copy['includedInCalc'] = True
        scored_candidates.append(job_copy)
    scored_candidates.sort(key=lambda x: -x['score'])

    if not scored_candidates:
        return {"error": "No candidates found"}

    best_score = scored_candidates[0]['score']
    relative_threshold = best_score * 0.75
    selected_neighbors = [c for c in scored_candidates if c['score'] >= relative_threshold or c['score'] > 80]
    if len(selected_neighbors) < 3:
        selected_neighbors = scored_candidates[:3]
        special_rules_applied.append('Cluster Extendido')
    if len(selected_neighbors) > 12:
        selected_neighbors = selected_neighbors[:12]

    # 2. Calcular drift y filtrar outliers
    neighbors_with_drift = []
    for n in selected_neighbors:
        real = time_to_minutes(n['horaReal'])
        no_delay = time_to_minutes(n['horaSinDemora'])
        d = real - no_delay
        if d < -1000:
            d += 1440
        n_copy = n.copy()
        n_copy['drift'] = d
        neighbors_with_drift.append(n_copy)
    drifts = [n['drift'] for n in neighbors_with_drift]
    mean_drift = np.mean(drifts) if drifts else 0
    std_dev = np.std(drifts) if drifts else 0
    valid_drifts = []
    processed_neighbors = []
    for n in neighbors_with_drift:
        threshold = max(std_dev * 1.5, 15)
        is_outlier = abs(n['drift'] - mean_drift) > threshold
        n['includedInCalc'] = not is_outlier
        if not is_outlier:
            valid_drifts.append(n['drift'])
        processed_neighbors.append(n)
    predicted_drift = calculate_median(valid_drifts)
    if predicted_drift > 15 and std_dev > 20:
        predicted_drift = predicted_drift * 0.7
        special_rules_applied.append('Filtro Ruido')

    # 3. Base Time
    if not target_job.get('horaSinDemora') or target_job['horaSinDemora'] in ['N/A', '']:
        valid_neighbors = [n for n in processed_neighbors if n['includedInCalc']]
        sum_base = sum(time_to_minutes(n['horaSinDemora']) for n in valid_neighbors)
        target_no_delay = sum_base / (len(valid_neighbors) or 1)
    else:
        target_no_delay = time_to_minutes(target_job['horaSinDemora'])

    # 4. Volume Adjustment
    valid_count = len(valid_drifts)
    avg_neighbor_debits = sum(n['debitos'] for n in processed_neighbors if n['includedInCalc']) / (valid_count or 1)
    volume_diff = target_job['debitos'] - avg_neighbor_debits
    volume_adjustment = (volume_diff / 100000) * 8
    efficiency_bias = -5

    # 5. Center Point Calculation
    predicted_minutes = target_no_delay + predicted_drift + volume_adjustment + efficiency_bias + manual_extra_time
    center_point = round_to_nearest_5(predicted_minutes)

    # Skew
    valid_mean_drift = np.mean(valid_drifts) if valid_drifts else 0
    skew = valid_mean_drift - predicted_drift
    range_start_offset = 15
    range_end_offset = 15
    skew_description = "Simétrico"
    if skew > 2:
        range_start_offset = 10
        range_end_offset = 20
        skew_description = "Asimétrico (Cola Derecha)"
        special_rules_applied.append('Asimetría: +Late Risk')
    elif skew < -2:
        range_start_offset = 20
        range_end_offset = 10
        skew_description = "Asimétrico (Cola Izquierda)"
        special_rules_applied.append('Asimetría: +Early Bias')
    total_width = range_end_offset + range_start_offset
    range_start = center_point - range_start_offset
    range_end = center_point + range_end_offset
    special_rules_applied.append('Rango Fijo (30m)')

    return {
        "pointEstimateMinutes": center_point,
        "volumeAdjustment": round(volume_adjustment),
        "baseTimeMinutes": round(target_no_delay),
        "bestCandidate": processed_neighbors[0] if processed_neighbors else None,
        "strategyUsed": "Eficiencia Asimétrica",
        "finalPrediction": {
            "start": minutes_to_time(range_start),
            "end": minutes_to_time(range_end)
        },
        "smartDetails": {
            "neighbors": processed_neighbors,
            "averageDelay": round(predicted_drift),
            "confidenceScore": 'Alta' if std_dev < 15 else 'Moderada',
            "dynamicRangeWidth": total_width,
            "safetyBias": 0,
            "specialAdjustments": special_rules_applied,
            "skewInfo": {
                "skewVal": round(skew, 2),
                "description": skew_description,
                "leftOffset": range_start_offset,
                "rightOffset": range_end_offset
            }
        }
    }
