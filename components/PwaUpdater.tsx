"use client";

import { useEffect } from "react";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const RELOAD_GUARD = "dabo-pwa-controller-reload";

export function PwaUpdater() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    let intervalId: number | undefined;
    let reloading = false;

    const checkForUpdate = () => {
      registration?.update().catch(() => {
        // Une vÃ©rification manquÃ©e ne doit jamais empÃªcher DABO de dÃ©marrer.
      });
    };

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;

      // Un seul rechargement par prise de contrÃ´le Ã©vite toute boucle si le
      // navigateur Ã©met plusieurs controllerchange pendant la mÃªme navigation.
      if (sessionStorage.getItem(RELOAD_GUARD) === "1") {
        sessionStorage.removeItem(RELOAD_GUARD);
        return;
      }

      sessionStorage.setItem(RELOAD_GUARD, "1");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((currentRegistration) => {
        registration = currentRegistration;
        checkForUpdate();
        intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
      })
      .catch(() => {
        // L'application reste utilisable sur les navigateurs sans PWA.
      });

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("pageshow", checkForUpdate);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("pageshow", checkForUpdate);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, []);

  return null;
}
