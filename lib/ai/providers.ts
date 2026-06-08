export interface AiProvider {
  generateSuggestions(prompt: string): Promise<string>;
}

export class GeminiProvider implements AiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateSuggestions(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${res.status} - ${err}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response from Gemini");
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || "gemini";
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is not set");
  }

  switch (provider) {
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${provider}. Supported: gemini`);
  }
}
