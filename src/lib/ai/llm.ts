export type LlmSource = "openai" | "deepseek";

type LlmCall = {
  source: LlmSource;
  url: string;
  apiKey: string;
  buildBody: (messages: Array<{ role: string; content: string }>, maxTokens: number) => Record<string, unknown>;
};

function resolveLlmCall(): LlmCall | null {
  const choice = process.env.AI_PROVIDER?.trim().toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();

  const openai = (): LlmCall => ({
    source: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: openaiKey!,
    buildBody: (messages, maxTokens) => ({
      model: "gpt-6-luna",
      temperature: 0,
      reasoning_effort: "none",
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  const deepseek = (): LlmCall => ({
    source: "deepseek",
    url: "https://api.deepseek.com/chat/completions",
    apiKey: deepseekKey!,
    buildBody: (messages, maxTokens) => ({
      model: "deepseek-flash",
      temperature: 0,
      thinking: { type: "disabled" },
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (choice === "openai") {
    if (openaiKey) return openai();
    if (deepseekKey) return deepseek();
    return null;
  }
  if (choice === "deepseek") {
    if (deepseekKey) return deepseek();
    if (openaiKey) return openai();
    return null;
  }
  if (deepseekKey) return deepseek();
  if (openaiKey) return openai();
  return null;
}

export function llmConfigured(): boolean {
  return resolveLlmCall() !== null;
}

function parseJsonContent(content: string): unknown {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

/**
 * One JSON-only model call. Returns null when no provider is configured or the
 * call or reply is unusable, so callers always have a deterministic path.
 */
export async function callJsonModel(input: {
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs?: number;
}): Promise<{ source: LlmSource; json: unknown } | null> {
  const llm = resolveLlmCall();
  if (!llm) return null;

  try {
    const res = await fetch(llm.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llm.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        llm.buildBody(
          [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          input.maxTokens,
        ),
      ),
      signal: AbortSignal.timeout(input.timeoutMs ?? 20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const json = parseJsonContent(content);
    return json === null ? null : { source: llm.source, json };
  } catch {
    return null;
  }
}
