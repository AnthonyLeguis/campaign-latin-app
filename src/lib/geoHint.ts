export type GeoHint = {
  lat: number;
  lon: number;
  accuracy: number;
  capturedAt: number;
};

const GEO_HINT_STORAGE_KEY = "campaign_geo_hint";
const GEO_PROMPTED_STORAGE_KEY = "campaign_geo_prompted";

function parseGeoHint(raw: string | null): GeoHint | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GeoHint>;
    if (
      typeof parsed?.lat === "number" &&
      Number.isFinite(parsed.lat) &&
      typeof parsed?.lon === "number" &&
      Number.isFinite(parsed.lon)
    ) {
      return {
        lat: parsed.lat,
        lon: parsed.lon,
        accuracy:
          typeof parsed?.accuracy === "number" &&
          Number.isFinite(parsed.accuracy)
            ? parsed.accuracy
            : 0,
        capturedAt:
          typeof parsed?.capturedAt === "number" &&
          Number.isFinite(parsed.capturedAt)
            ? parsed.capturedAt
            : Date.now(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function getStoredGeoHint(): GeoHint | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseGeoHint(window.localStorage.getItem(GEO_HINT_STORAGE_KEY));
}

function saveGeoHint(geoHint: GeoHint) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GEO_HINT_STORAGE_KEY, JSON.stringify(geoHint));
}

export function markGeoPrompted() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GEO_PROMPTED_STORAGE_KEY, "1");
}

export function wasGeoPrompted() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(GEO_PROMPTED_STORAGE_KEY) === "1";
}

export async function requestAndStoreGeoHint(options?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? 3000;
  const maximumAgeMs = options?.maximumAgeMs ?? 10 * 60 * 1000;

  markGeoPrompted();

  const geoHint = await new Promise<GeoHint | null>((resolve) => {
    let finished = false;

    const done = (value: GeoHint | null) => {
      if (!finished) {
        finished = true;
        resolve(value);
      }
    };

    const timeout = window.setTimeout(() => done(null), timeoutMs + 250);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timeout);
        done({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
          capturedAt: Date.now(),
        });
      },
      () => {
        window.clearTimeout(timeout);
        done(null);
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    );
  });

  if (geoHint) {
    saveGeoHint(geoHint);
  }

  return geoHint;
}
