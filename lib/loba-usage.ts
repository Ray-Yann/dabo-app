import { createAdminClient } from "@/lib/supabase-admin";

export type LobaUsageSurface = "admin" | "household";

export type LobaUsageStatus =
  | "success"
  | "provider_error"
  | "empty_response"
  | "request_error";

export type LobaProviderUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
} | null | undefined;

export type RecordLobaUsageInput = {
  surface: LobaUsageSurface;
  provider: string;
  model: string;
  userId?: string | null;
  householdId?: string | null;
  intent?: string | null;
  domain?: string | null;
  status: LobaUsageStatus;
  providerStatus?: number | null;
  usage?: LobaProviderUsage;
};

type LobaModelPricing = {
  inputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
};

export type LobaUsageCost = {
  inputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
};

export const LOBA_DEFAULT_DAILY_LIMITS: Record<LobaUsageSurface, number> = {
  admin: 100,
  household: 20,
};

export type LobaQuotaReservation = {
  allowed: boolean;
  limit: number;
};

function readPositiveIntegerEnv(
  name: string,
  fallback: number
): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error("[loba/quota] invalid environment limit", {
      name,
      fallback,
    });
    return fallback;
  }

  return parsed;
}

export function getLobaDailyLimit(
  surface: LobaUsageSurface
): number {
  return surface === "household"
    ? readPositiveIntegerEnv(
        "LOBA_HOUSEHOLD_DAILY_LIMIT",
        LOBA_DEFAULT_DAILY_LIMITS.household
      )
    : readPositiveIntegerEnv(
        "LOBA_ADMIN_DAILY_LIMIT",
        LOBA_DEFAULT_DAILY_LIMITS.admin
      );
}

export async function reserveLobaDailyQuota(
  surface: LobaUsageSurface,
  ownerId: string
): Promise<LobaQuotaReservation> {
  const limit = getLobaDailyLimit(surface);

  const { data, error } = await createAdminClient().rpc(
    "reserve_loba_ai_daily_quota",
    {
      p_surface: surface,
      p_owner_id: ownerId,
      p_daily_limit: limit,
    }
  );

  if (error) {
    console.error("[loba/quota] reservation failed", {
      surface,
      code: error.code,
      message: error.message,
    });

    throw new Error("LOBA_QUOTA_RESERVATION_FAILED");
  }

  return {
    allowed: data === true,
    limit,
  };
}

const LOBA_MODEL_PRICING: Record<string, LobaModelPricing> = {
  "openai/gpt-oss-120b": {
    inputPricePerMillionUsd: 0.15,
    outputPricePerMillionUsd: 0.6,
  },
};

function safeTokenCount(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? Math.trunc(value)
    : null;
}

export function calculateLobaUsageCost(
  model: string,
  usage: LobaProviderUsage
): LobaUsageCost | null {
  const pricing = LOBA_MODEL_PRICING[model];
  if (!pricing) return null;

  const promptTokens = safeTokenCount(usage?.prompt_tokens);
  const completionTokens = safeTokenCount(usage?.completion_tokens);

  if (promptTokens === null || completionTokens === null) {
    return null;
  }

  const inputCostUsd =
    (promptTokens / 1_000_000) * pricing.inputPricePerMillionUsd;

  const outputCostUsd =
    (completionTokens / 1_000_000) * pricing.outputPricePerMillionUsd;

  return {
    inputPricePerMillionUsd: pricing.inputPricePerMillionUsd,
    outputPricePerMillionUsd: pricing.outputPricePerMillionUsd,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
  };
}

export async function recordLobaUsage(
  input: RecordLobaUsageInput
): Promise<void> {
  try {
    const usage = input.usage;
    const cost = calculateLobaUsageCost(input.model, usage);

    const { error } = await createAdminClient()
      .from("loba_ai_usage")
      .insert({
        surface: input.surface,
        provider: input.provider,
        model: input.model,
        user_id: input.userId ?? null,
        household_id: input.householdId ?? null,
        intent: input.intent ?? null,
        domain: input.domain ?? null,
        status: input.status,
        provider_status: input.providerStatus ?? null,
        prompt_tokens: safeTokenCount(usage?.prompt_tokens),
        completion_tokens: safeTokenCount(usage?.completion_tokens),
        total_tokens: safeTokenCount(usage?.total_tokens),
        input_price_per_million_usd:
          cost?.inputPricePerMillionUsd ?? null,
        output_price_per_million_usd:
          cost?.outputPricePerMillionUsd ?? null,
        input_cost_usd: cost?.inputCostUsd ?? null,
        output_cost_usd: cost?.outputCostUsd ?? null,
        total_cost_usd: cost?.totalCostUsd ?? null,
      });

    if (error) {
      console.error("[loba/usage] persistence failed", {
        surface: input.surface,
        status: input.status,
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[loba/usage] persistence exception", {
      surface: input.surface,
      status: input.status,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message.slice(0, 300) }
          : { name: "UnknownError" },
    });
  }
}
