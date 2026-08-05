import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/themes.css";
import "./styles/base.css";
import "./styles.css";

async function removeLegacyOfflineState() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const wasControlled = navigator.serviceWorker.controller !== null;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    // The current document remains controlled until its next navigation.
    if (wasControlled && results.some(Boolean)) window.location.reload();
  } catch (error) {
    console.warn("Could not remove legacy service worker state", error);
  }
}

void removeLegacyOfflineState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
