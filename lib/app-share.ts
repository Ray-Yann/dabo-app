import type { SupabaseClient } from "@supabase/supabase-js";

export type AppShareResult =
  | { outcome: "shared"; method: "native" | "clipboard" }
  | { outcome: "cancelled" }
  | { outcome: "error" };

async function recordAppShare(
  supabase: SupabaseClient,
  householdId: string | null,
  method: "native" | "clipboard",
  referralToken: string,
) {
  const payload = { method, householdId, referralToken };

  try {
    let { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    if (!token) return false;

    const send = (accessToken: string) =>
      fetch("/api/share-app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

    let response = await send(token);

    if (response.status === 401) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token;
      if (token) response = await send(token);
    }

    if (!response.ok) {
      console.warn(
        "[DABO share] partage réussi, mesure indisponible",
        response.status,
      );
    }

    return response.ok;
  } catch {
    return false;
  }
}

export async function shareDaboApp(options: {
  supabase: SupabaseClient;
  householdId: string | null;
  message: string;
}): Promise<AppShareResult> {
  const referralToken = crypto.randomUUID();
  const shareData = {
    title: "Dabo",
    text: options.message,
    url: `https://dabo-app.vercel.app/?ref=${referralToken}`,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      await recordAppShare(
        options.supabase,
        options.householdId,
        "native",
        referralToken,
      );
      return { outcome: "shared", method: "native" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { outcome: "cancelled" };
      }
      return { outcome: "error" };
    }
  }

  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    await recordAppShare(
      options.supabase,
      options.householdId,
      "clipboard",
      referralToken,
    );
    return { outcome: "shared", method: "clipboard" };
  } catch {
    return { outcome: "error" };
  }
}
