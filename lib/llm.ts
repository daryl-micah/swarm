import OpenAI from "openai";

export const llm = new OpenAI({
  apiKey: process.env.NEBIUS_API_KEY,
  baseURL: process.env.NEBIUS_BASE_URL ?? "https://api.studio.nebius.com/v1/",
});

export const NANO = process.env.MODEL_NANO!;
export const ULTRA = process.env.MODEL_ULTRA!;

// one JSON-returning chat call, retrying on 429/5xx with backoff
export async function json<T>(model: string, system: string, user: string, temperature = 0.8): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await llm.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      console.log(`usage ${model} ${r.usage?.prompt_tokens} ${r.usage?.completion_tokens}`);
      return JSON.parse(r.choices[0].message.content ?? "{}") as T;
    } catch (e: any) {
      const retry = e?.status === 429 || e?.status >= 500 || e instanceof SyntaxError;
      if (!retry || attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}
