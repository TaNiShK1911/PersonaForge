"""
PersonaForge — Personalization Service
========================================
AI provider chain: Claude → Gemini → OpenAI → Template.
"""

import json
import time
from typing import Optional

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def generate_personalization(
    user: dict,
    persona: dict,
    causal_effects: list,
    channel: str = "email",
    tone: str = "professional",
) -> dict:
    """Generate personalized content via provider chain."""
    start = time.time()
    for provider_fn in [_try_claude, _try_gemini, _try_openai, _template_fallback]:
        try:
            result = await provider_fn(user, persona, causal_effects, channel, tone)
            if result:
                result["latency_ms"] = int((time.time() - start) * 1000)
                return result
        except Exception as e:
            logger.warning("provider_failed", provider=provider_fn.__name__, error=str(e))
            continue
    # Should never reach here because template_fallback always succeeds
    raise RuntimeError("All personalization providers failed")


async def _try_claude(user, persona, effects, channel, tone) -> Optional[dict]:
    if not settings.anthropic_api_key:
        return None
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = _build_prompt(user, persona, effects, channel, tone)
    resp = await client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text
    parsed = _parse_json(text)
    return _enrich(parsed, user, persona, "claude", resp.usage.output_tokens + resp.usage.input_tokens)


async def _try_gemini(user, persona, effects, channel, tone) -> Optional[dict]:
    if not settings.gemini_api_key:
        return None
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-pro")
    prompt = _build_prompt(user, persona, effects, channel, tone)
    resp = await model.generate_content_async(prompt)
    parsed = _parse_json(resp.text)
    return _enrich(parsed, user, persona, "gemini", 0)


async def _try_openai(user, persona, effects, channel, tone) -> Optional[dict]:
    if not settings.openai_api_key:
        return None
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    prompt = _build_prompt(user, persona, effects, channel, tone)
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    text = resp.choices[0].message.content
    parsed = _parse_json(text)
    return _enrich(parsed, user, persona, "openai", resp.usage.total_tokens)


async def _template_fallback(user, persona, effects, channel, tone) -> dict:
    """Deterministic template engine — always succeeds."""
    name = persona.get("name", "Bargain Hunter")
    kind = persona.get("kind", "price_sensitive")
    templates = {
        "price_sensitive": {
            "headline": "Flash Sale: Save 30% Today Only",
            "email_subject": "🎯 Your exclusive 30% discount expires tonight",
            "email_body": f"Hi {user.get('name', 'there').split()[0]},\n\nWe noticed you've been comparing options — smart move. Here's our best offer of the week: 30% off your wishlist items, today only.",
            "ad_copy": "Compare all you want — then save 30%. Lowest price guaranteed. Ends tonight.",
            "push_notification": "⚡ 30% off your wishlist — ends in 4 hours",
            "cta": "Claim 30% Discount",
        },
        "luxury_seeker": {
            "headline": "An Exclusive Premier Collection — By Invitation",
            "email_subject": "Private viewing: The Premier Collection",
            "email_body": f"Hi {user.get('name', 'there').split()[0]},\n\nYou've been invited to a private viewing of our Premier Collection — handcrafted, limited to 200 pieces worldwide.",
            "ad_copy": "Limited to 200 pieces. Handcrafted. No discounts — just craft.",
            "push_notification": "💎 Premier Collection — by invitation",
            "cta": "Request Private Viewing",
        },
    }
    t = templates.get(kind, templates["price_sensitive"])
    return _enrich({
        "headline": t["headline"],
        "email_subject": t["email_subject"],
        "email_body": t["email_body"],
        "ad_copy": t["ad_copy"],
        "push_notification": t["push_notification"],
        "cta": t["cta"],
        "product_ranking": [],
    }, user, persona, "template", 0)


def _build_prompt(user, persona, effects, channel, tone) -> str:
    return f"""You are an expert marketing copywriter.

User persona: {persona.get('name', 'Bargain Hunter')}
User features: {json.dumps(user.get('features', {}))}
Top causal drivers: {json.dumps(effects[:3])}

Generate persona-aware marketing copy as STRICT JSON with these fields:
{{
  "headline": "string (max 80 chars)",
  "email_subject": "string (max 90 chars)",
  "email_body": "string (3-4 paragraphs)",
  "ad_copy": "string (max 140 chars)",
  "push_notification": "string (max 90 chars)",
  "cta": "string (max 30 chars)",
  "product_ranking": [{{"product_id": "string", "score": 0.0-1.0, "reason": "string"}}]
}}

Channel: {channel}
Tone: {tone}

Return ONLY valid JSON."""


def _parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract from code block
        import re
        m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        return {}


def _enrich(parsed, user, persona, provider, tokens) -> dict:
    return {
        "headline": parsed.get("headline", ""),
        "email_subject": parsed.get("email_subject", ""),
        "email_body": parsed.get("email_body", ""),
        "ad_copy": parsed.get("ad_copy", ""),
        "push_notification": parsed.get("push_notification", ""),
        "cta": parsed.get("cta", ""),
        "product_ranking": parsed.get("product_ranking", []),
        "provider": provider,
        "tokens_used": tokens,
        "persona_kind": persona.get("kind"),
    }
