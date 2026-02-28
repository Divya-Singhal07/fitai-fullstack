# backend/app/services/nlp_service.py
# huggingface zero-shot classifier for intent detection
# this runs fast and doesn't need a separate api call to openai

from transformers import pipeline
import asyncio
import logging

logger = logging.getLogger(__name__)

# lazy-load the model so startup isn't slow
_classifier = None

INTENT_LABELS = [
    "exercise_form",
    "diet_advice",
    "workout_plan",
    "motivation",
    "injury_help",
    "general_question",
]


def get_classifier():
    global _classifier
    if _classifier is None:
        try:
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1,   # cpu - change to 0 for gpu
            )
            logger.info("HuggingFace classifier loaded")
        except Exception as e:
            logger.warning(f"Could not load HF model: {e}. Using fallback.")
            _classifier = "fallback"
    return _classifier


async def classify_intent(text: str) -> str:
    """returns the most likely intent for the user message"""
    clf = get_classifier()

    if clf == "fallback" or not text.strip():
        return "general_question"

    # run in thread pool so we don't block the event loop
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None,
            lambda: clf(text, INTENT_LABELS, multi_label=False)
        )
        return result["labels"][0]
    except Exception as e:
        logger.warning(f"Intent classification failed: {e}")
        return "general_question"
