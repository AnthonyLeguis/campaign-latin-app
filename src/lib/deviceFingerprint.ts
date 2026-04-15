import FingerprintJS from "@fingerprintjs/fingerprintjs";

const FALLBACK_STORAGE_KEY = "campaign_device_id";

function getOrCreateFallbackId(): string {
  try {
    const existing = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(FALLBACK_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export async function getDeviceVisitorId(): Promise<string> {
  if (typeof window === "undefined") {
    return `server-${Date.now()}`;
  }

  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    if (result?.visitorId) {
      return result.visitorId;
    }
  } catch {
    // Fallback silencioso para no romper el flujo de llamada.
  }

  return getOrCreateFallbackId();
}
