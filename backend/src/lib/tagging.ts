import fetch from "node-fetch";

export type TagSource = "auto" | "ai";

export interface TagSuggestion {
  name: string;
  source: TagSource;
}

function cleanTag(value: string): string | null {
  const clean = value.toLowerCase().trim().replace(/^#/, "").replace(/[^a-z0-9äöüß-]+/gi, "-").replace(/^-+|-+$/g, "");
  if (clean.length < 3 || clean.length > 32) return null;
  if (/^\d+$/.test(clean) || /^\d{1,3}(?:-\d{1,3}){3}$/.test(clean)) return null;
  return clean;
}

export async function suggestAiTags(input: {
  kind: "bookmark" | "note";
  title?: string;
  url?: string;
  description?: string;
  content?: string;
}): Promise<TagSuggestion[] | null> {
  const provider = (process.env.AI_TAGGING_PROVIDER ?? "").toLowerCase();
  const apiKey = process.env.AI_TAGGING_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!provider || !apiKey) return null;

  const baseUrl = process.env.AI_TAGGING_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_TAGGING_MODEL ?? "gpt-4o-mini";
  const prompt = [
    `Create 3-8 short lowercase tags for this ${input.kind}.`,
    "Return only JSON: {\"tags\":[\"tag\"]}.",
    input.url ? `URL: ${input.url}` : "",
    input.title ? `Title: ${input.title}` : "",
    input.description ? `Description: ${input.description}` : "",
    input.content ? `Content: ${input.content.slice(0, 3000)}` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You generate concise organizational tags." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      timeout: 8000,
    } as any);

    if (!response.ok) return null;
    const body = await response.json() as any;
    const content = body?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(String(content ?? "{}"));
    if (!Array.isArray(parsed.tags)) return null;
    return parsed.tags
      .map((tag: unknown) => cleanTag(String(tag)))
      .filter(Boolean)
      .slice(0, 8)
      .map((name: string) => ({ name, source: "ai" as const }));
  } catch {
    return null;
  }
}
