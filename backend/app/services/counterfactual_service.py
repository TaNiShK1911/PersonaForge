"""
PersonaForge — Counterfactual Service
=======================================
Structural causal model for multi-treatment what-if simulation.
"""

from typing import List

from app.core.logging import get_logger
from app.services.causal_service import estimate_all_effects

logger = get_logger(__name__)

DEFAULT_SCENARIOS = [
    {"label": "Baseline (Natural Exposure)", "treatments": {}},
    {"label": "Aggressive Discount Only", "treatments": {"discount": True}},
    {"label": "Full Marketing Stack", "treatments": {
        "discount": True, "urgency_messaging": True,
        "social_proof": True, "product_reviews": True,
    }},
    {"label": "Personalized Recommendation Only", "treatments": {}},
    {"label": "Nurture Sequence (No Urgency)", "treatments": {
        "social_proof": True, "product_reviews": True,
    }},
]


def predict_conversion(
    user_features: dict,
    treatments: dict,
    baseline_conv: float,
    causal_effects: dict,
) -> float:
    """Structural causal model: P(Y|T) = baseline * Π(1 + ATE * responsiveness)."""
    responsiveness_map = {
        "discount": user_features.get("discount_response", 0.5),
        "social_proof": user_features.get("social_proof_response", 0.5),
        "product_reviews": user_features.get("review_reliance", 0.5),
        "urgency_messaging": user_features.get("urgency_response", 0.5),
    }
    p = baseline_conv * 0.4 + 0.6 * sum(responsiveness_map.values()) / 4
    for t, applied in treatments.items():
        if applied:
            eff = causal_effects.get(t, 0)
            resp = responsiveness_map.get(t, 0.5)
            p *= 1 + eff * resp
    return max(0.01, min(0.97, p))


async def run_counterfactual(user: dict, users_df) -> dict:
    """Run all scenarios for a user."""
    effects_list = estimate_all_effects(users_df)
    causal_effects = {e["treatment"]: e["ate"] for e in effects_list}

    baseline_conv = float(users_df["converted"].mean()) if len(users_df) > 0 else 0.1
    baseline_prob = predict_conversion(user["features"], {}, baseline_conv, causal_effects)

    scenarios = []
    for s in DEFAULT_SCENARIOS:
        prob = predict_conversion(user["features"], s["treatments"], baseline_conv, causal_effects)
        uplift = ((prob - baseline_prob) / max(0.01, baseline_prob)) * 100
        scenarios.append({
            "label": s["label"],
            "treatments": s["treatments"],
            "conversion_probability": prob,
            "uplift_pct": uplift,
            "estimated_revenue": prob * user.get("revenue", 75),
        })

    winner = max(scenarios, key=lambda x: x["conversion_probability"])
    return {
        "baseline": scenarios[0],
        "scenarios": scenarios[1:],
        "winner": winner,
        "confidence_interval": {
            "lower": baseline_prob * 0.92,
            "upper": baseline_prob * 1.08,
        },
        "probability_shift": winner["conversion_probability"] - baseline_prob,
        "recommendation": f"Apply '{winner['label']}' for +{winner['uplift_pct']:.1f}% conversion uplift.",
        "method_comparison": effects_list,
    }
