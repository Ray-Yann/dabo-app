import { NextRequest, NextResponse } from "next/server";
import { requireDaboAdmin } from "@/lib/admin-auth";
import {
  buildLobaSystemPrompt,
  detectLobaIntent,
  LOBA_DEFAULT_MODEL,
  sanitizeLobaMessages,
  type LobaAiContext,
  type LobaAiMessage,
} from "@/lib/loba-ai";

export const dynamic = "force-dynamic";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function isContext(value: unknown): value is LobaAiContext {
  if (!value || typeof value !== "object") return false;
  const context = value as LobaAiContext;
  return Boolean(context.kpis && typeof context.kpis === "object" && Array.isArray(context.insights) && Array.isArray(context.funnel));
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const admin = await requireDaboAdmin(token);
  if (!admin) return NextResponse.json({ error: "Accès administrateur refusé" }, { status: 403 });

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "LOBA IA n'est pas encore connectée à son moteur génératif.", code: "LOBA_AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: { question?: unknown; history?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 4000) : "";
  if (!question) return NextResponse.json({ error: "Question vide" }, { status: 400 });
  if (!isContext(body.context)) return NextResponse.json({ error: "Contexte LOBA invalide" }, { status: 400 });

  const history = sanitizeLobaMessages(Array.isArray(body.history) ? (body.history as LobaAiMessage[]) : []);
  const model = process.env.LOBA_AI_MODEL?.trim() || LOBA_DEFAULT_MODEL;
  const intent = detectLobaIntent(question);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildLobaSystemPrompt(body.context, intent) },
          ...history,
          { role: "user", content: question },
        ],
        temperature: 0.35,
        max_completion_tokens: intent === "simple" ? 380 : 650,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const providerText = (await response.text()).slice(0, 800);
      console.error("[admin/loba] Groq error", response.status, providerText);
      return NextResponse.json(
        { error: response.status === 429 ? "LOBA a atteint sa limite gratuite temporaire. Réessaie un peu plus tard." : "Le moteur IA de LOBA est momentanément indisponible.", code: "LOBA_AI_PROVIDER_ERROR" },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: "LOBA n'a pas produit de réponse." }, { status: 502 });

    return NextResponse.json({
      answer,
      engine: "ai",
      provider: "Groq",
      model,
      usage: data.usage || null,
    });
  } catch (error) {
    console.error("[admin/loba] AI request failed", error);
    return NextResponse.json({ error: "Le moteur IA de LOBA est momentanément indisponible.", code: "LOBA_AI_PROVIDER_ERROR" }, { status: 502 });
  }
}
