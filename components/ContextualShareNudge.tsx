"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Share2, X } from "lucide-react";
import { useT } from "@/lib/language-context";
import { shareDaboApp } from "@/lib/app-share";
import {
  CONTEXTUAL_SHARE_SUCCESS_EVENT,
  contextualShareEligible,
  markContextualSharePromptShown,
  markContextualShareShared,
  postponeContextualShare,
} from "@/lib/contextual-share";

type Props = {
  supabase: SupabaseClient;
  userId: string;
  householdId: string;
};

export function ContextualShareNudge({
  supabase,
  userId,
  householdId,
}: Props) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    function showIfEligible() {
      if (!contextualShareEligible(userId, householdId)) return;
      markContextualSharePromptShown(userId, householdId);
      setVisible(true);
    }

    showIfEligible();

    function onSuccess(event: Event) {
      const detail = (event as CustomEvent<{
        userId?: string;
        householdId?: string;
      }>).detail;

      if (
        detail?.userId !== userId ||
        detail?.householdId !== householdId
      ) {
        return;
      }

      showIfEligible();
    }

    window.addEventListener(CONTEXTUAL_SHARE_SUCCESS_EVENT, onSuccess);
    return () =>
      window.removeEventListener(CONTEXTUAL_SHARE_SUCCESS_EVENT, onSuccess);
  }, [householdId, userId]);

  if (!visible) return null;

  function later() {
    postponeContextualShare(userId, householdId);
    setVisible(false);
  }

  async function share() {
    setSharing(true);
    setError(false);

    try {
      const result = await shareDaboApp({
        supabase,
        householdId,
        message: t("share_app_message"),
      });

      if (result.outcome === "shared") {
        markContextualShareShared(userId, householdId);
        setVisible(false);
        return;
      }

      if (result.outcome === "error") setError(true);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mx-5 mb-4 rounded-2xl border border-border bg-paper p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mustardBg">
          <Share2 size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-ink">
                {t("contextual_share_title")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                {t("contextual_share_text")}
              </p>
            </div>

            <button
              type="button"
              onClick={later}
              className="shrink-0 text-muted"
              aria-label={t("contextual_share_later")}
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-700">
              {t("contextual_share_error")}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={sharing}
              onClick={() => void share()}
              className="text-xs font-semibold text-ink underline underline-offset-2 disabled:opacity-50"
            >
              {sharing ? "…" : t("contextual_share_action")}
            </button>

            <button
              type="button"
              disabled={sharing}
              onClick={later}
              className="text-xs text-muted disabled:opacity-50"
            >
              {t("contextual_share_later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
