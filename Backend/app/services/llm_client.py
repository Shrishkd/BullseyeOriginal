# app/services/llm_client.py

import os
from typing import Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LLMClient:
    """
    Gemini-based LLM client for Bullseye.
    Uses the modern `google-genai` SDK.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured. "
                "Ensure it is set in backend/.env and the server is restarted."
            )

        self.client = genai.Client(api_key=api_key)
        # Note: 'gemini-2.5-flash' does not currently exist. 
        # Using 'gemini-2.0-flash' which is the latest fast model.
        # If you have early access to a specific version, change this back.
        self.model_name = "gemini-2.5-flash" 

    def chat(self, system_prompt: str, user_message: str) -> str:
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {
                                # Combined prompt strategy is fine, but ensure
                                # the instruction is clear.
                                "text": f"{system_prompt}\n\n{user_message}"
                            }
                        ],
                    }
                ],
                config={
                    "temperature": 0.4,
                    # FIX 1: Increased from 512 to 2048 to prevent cutoff
                    "max_output_tokens": 2048, 
                    # FIX 2: Enable Google Search Grounding for live data
                    "tools": [
                        types.Tool(
                            google_search=types.GoogleSearchRetrieval()
                        )
                    ]
                },
            )

            if not response or not response.text:
                return "No response generated."

            return response.text.strip()

        except Exception as e:
            # Print error to console for debugging
            print(f"Gemini API Error: {e}")
            return f"AI service error: {str(e)}"

    async def generate_json(
        self,
        system_prompt: str,
        user_message: str,
        schema: Type[T],
        temperature: float = 0.5,
    ) -> T:
        """
        Async structured generation for agents.

        No Google Search grounding: agents must argue only from the evidence
        they are given. Raises on failure so callers can degrade gracefully.
        """
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=2048,
                response_mime_type="application/json",
                response_schema=schema,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        if isinstance(response.parsed, schema):
            return response.parsed
        if not response.text:
            raise RuntimeError("Empty response from Gemini")
        return schema.model_validate_json(response.text)
