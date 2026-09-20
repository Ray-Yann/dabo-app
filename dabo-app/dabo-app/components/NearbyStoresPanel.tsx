"use client";

import { useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NearbyStore } from "@/lib/nearby-stores";

type Props = {
  supabase: SupabaseClient;
  t: (key: string) => string;
  onUseStore: (name: string) => Promise<void> | void;
};

type State = "idle" | "locating" | "loading" | "ready" | "denied" | "unavailable" | "error";

function distanceLabel(meters: number, locale: string) {
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

export function NearbyStoresPanel({ supabase, t, onUseStore }: Props) {
  const [state, setState] = useState<State>("idle");
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  async function searchNearby() {
    setSelectedName(null);
    if (!("geolocation" in navigator)) {
      setState("unavailable");
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(async (position) => {
      setState("loading");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setState("error");
          return;
        }
        const response = await fetch("/api/nearby-stores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
        if (!response.ok) {
          setState(response.status === 503 ? "unavailable" : "error");
          return;
        }
        const payload = await response.json() as { stores?: NearbyStore[] };
        setStores(Array.isArray(payload.stores) ? payload.stores : []);
        setState("ready");
      } catch {
        setState("error");
      }
    }, (error) => {
      setState(error.code === error.PERMISSION_DENIED ? "denied" : "error");
    }, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60_000,
    });
  }

  async function chooseStore(name: string) {
    await onUseStore(name);
    setSelectedName(name);
  }

  const busy = state === "locating" || state === "loading";
  const locale = typeof document !== "undefined" ? document.documentElement.lang || "fr" : "fr";

  return (
    <section className="mx-5 mb-5 rounded-3xl border border-borderLight bg-white2 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-paper text-ink"><MapPin size={17} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">{t("courses_nearby_title")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("courses_nearby_intro")}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{t("courses_nearby_privacy")}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void searchNearby()}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-3.5 py-2 text-xs font-medium text-paper disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
        {busy ? t("courses_nearby_searching") : t("courses_nearby_find")}
      </button>

      {state === "denied" && <p className="mt-3 text-xs text-muted">{t("courses_nearby_denied")}</p>}
      {state === "unavailable" && <p className="mt-3 text-xs text-muted">{t("courses_nearby_unavailable")}</p>}
      {state === "error" && <p className="mt-3 text-xs text-muted">{t("courses_nearby_error")}</p>}
      {state === "ready" && stores.length === 0 && <p className="mt-3 text-xs text-muted">{t("courses_nearby_empty")}</p>}

      {state === "ready" && stores.length > 0 && (
        <div className="mt-4 space-y-2">
          {stores.map((store) => (
            <div key={store.id} className="flex items-center gap-3 rounded-2xl border border-borderLight bg-paper px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{store.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {distanceLabel(store.distanceMeters, locale)}{store.address ? ` · ${store.address}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void chooseStore(store.name)}
                className="shrink-0 rounded-xl border border-border bg-white2 px-3 py-2 text-xs font-medium text-ink"
              >
                {selectedName === store.name ? t("courses_nearby_selected") : t("courses_nearby_use")}
              </button>
            </div>
          ))}
        </div>
      )}

      {(state === "ready" || state === "unavailable") && (
        <p className="mt-3 text-[10px] text-muted">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2">© OpenStreetMap contributors</a>
        </p>
      )}
    </section>
  );
}
