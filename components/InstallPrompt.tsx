"use client";

import { useEffect, useState } from "react";
import { Smartphone, X, Share, MoreVertical } from "lucide-react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    const dismissed = localStorage.getItem("dabo-install-dismissed");
    const detected = detectPlatform();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detected);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed && !isStandalone() && detected !== "other") setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("dabo-install-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-5 mb-4 bg-ink rounded-2xl p-4 text-paper">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <Smartphone size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1">Installe Dabo sur ton écran d&apos;accueil</div>
          {platform === "ios" && (
            <p className="text-xs text-paper/80 leading-relaxed">
              Appuie sur le bouton <Share size={11} className="inline mx-0.5" /> Partager en bas de Safari, puis choisis « Sur l&apos;écran d&apos;accueil ». C&apos;est aussi nécessaire pour recevoir les notifications sur iPhone.
            </p>
          )}
          {platform === "android" && (
            <p className="text-xs text-paper/80 leading-relaxed">
              Appuie sur les trois points <MoreVertical size={11} className="inline mx-0.5" /> en haut à droite de Chrome, puis choisis « Installer l&apos;application » (ou « Ajouter à l&apos;écran d&apos;accueil »).
            </p>
          )}
        </div>
        <button onClick={dismiss} className="text-paper/60 shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
