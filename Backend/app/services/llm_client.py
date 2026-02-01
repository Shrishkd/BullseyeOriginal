# app/services/llm_client.py

import os
from google import genai
from google.genai import types

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