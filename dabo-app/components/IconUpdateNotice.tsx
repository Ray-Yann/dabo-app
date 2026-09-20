"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useT } from "@/lib/language-context";

const NOTICE_VERSION = "v3";
const DISMISSED_KEY = `dabo-icon-update-${NOTICE_VERSION}-dismissed`;

type Platform = "ios" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & { standalone?: boolean };
  const isiOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isiPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isiOSDevice || isiPadOS || nav.standalone === true ? "ios" : "other";
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function IconUpdateNotice() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const t = useT();

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed || !isStandalone()) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-5 mb-4 rounded-2xl border border-border bg-white2 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mustardBg">
          <RefreshCw size={16} className="text-mustard" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-sm font-medium text-ink">{t("icon_update_title")}</div>
          <p className="text-xs leading-relaxed text-muted">
            {platform === "ios" ? t("icon_update_ios") : t("icon_update_other")}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{t("icon_update_data_safe")}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1 text-muted"
          aria-label={t("icon_update_close")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
