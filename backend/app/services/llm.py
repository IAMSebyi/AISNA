import json
from typing import Any, Dict, Protocol

from app.core.config import settings


class LLMConfigurationError(RuntimeError):
    pass


class LLMServiceError(RuntimeError):
    pass


class LLMClient(Protocol):
    async def generate_json(
        self,
        *,
        instructions: str,
        prompt: str,
        schema: Dict[str, Any],
        schema_name: str,
    ) -> Dict[str, Any]:
        ...


class OpenAIResponsesClient:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise LLMConfigurationError("OPENAI_API_KEY is not configured.")

        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise LLMConfigurationError(
                "The openai package is not installed. Run pip install -r backend/requirements.txt."
            ) from exc

        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=settings.OPENAI_TIMEOUT_SECONDS,
        )
        self.model = settings.OPENAI_MODEL

    async def generate_json(
        self,
        *,
        instructions: str,
        prompt: str,
        schema: Dict[str, Any],
        schema_name: str,
    ) -> Dict[str, Any]:
        try:
            response = await self.client.responses.create(
                model=self.model,
                instructions=instructions,
                input=prompt,
                reasoning={"effort": settings.OPENAI_REASONING_EFFORT},
                text={
                    "format": {
                        "type": "json_schema",
                        "name": schema_name,
                        "schema": schema,
                        "strict": True,
                    }
                },
            )
        except Exception as exc:
            raise LLMServiceError(f"OpenAI request failed: {exc}") from exc

        try:
            return json.loads(response.output_text)
        except (AttributeError, json.JSONDecodeError) as exc:
            raise LLMServiceError("OpenAI response did not contain valid JSON output.") from exc
