"use client";

import { useEffect } from "react";

export function PwaUpdater() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const checkForUpdate = () => {
      registration?.update().catch(() => {
        // Une vérification manquée ne doit jamais empêcher DABO de démarrer.
      });
    };

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((currentRegistration) => {
        registration = currentRegistration;
        checkForUpdate();
      })
      .catch(() => {
        // L'application reste utilisable sur les navigateurs sans PWA.
      });

    window.addEventListener("focus", checkForUpdate);
    return () => window.removeEventListener("focus", checkForUpdate);
  }, []);

  return null;
}
