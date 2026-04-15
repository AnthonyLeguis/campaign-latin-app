import { useCallback, useEffect, useRef, useState } from "react"; // ¡Añadido useState!
import { useInactivityRedirect } from "../hooks/useInactivityRedirect";
import { PointingHand } from "../components/PointingHand";
import { META_CAPI_BASE, sendMetaCapiEvent } from "../lib/metaCapi";
import { getDeviceVisitorId } from "../lib/deviceFingerprint";

type PhoneConfig = {
  raw: string;
  display: string;
  diversionNumbers: string[];
};

export const FinalView = ({
  waitTime = 30,
  agentsAvailable = 5,
}: { waitTime?: number; agentsAvailable?: number } = {}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref para prevenir envíos duplicados de Lead
  const lastLeadSentRef = useRef<number>(0);
  const [isCallBlocked, setIsCallBlocked] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // 1. NUEVO: Estado para guardar el teléfono (con tus valores originales como respaldo)
  const [phoneConfig, setPhoneConfig] = useState<PhoneConfig>({
    raw: "+14696637105",
    display: "(888) 904-4955",
    diversionNumbers: [],
  });

  // 2. NUEVO: Leer el archivo config.json al cargar el componente
  useEffect(() => {
    fetch("/config.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.phoneRaw && data.phoneDisplay) {
          const diversionNumbers = Array.isArray(data.diversionNumbers)
            ? data.diversionNumbers.filter(
                (n: unknown) => typeof n === "string",
              )
            : [];

          setPhoneConfig({
            raw: data.phoneRaw,
            display: data.phoneDisplay,
            diversionNumbers,
          });
        }
      })
      .catch((err) => console.error("Error cargando la configuración:", err));
  }, []);

  const getGeoHint = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return null;
    }

    return await new Promise<{
      lat: number;
      lon: number;
      accuracy: number;
    } | null>((resolve) => {
      let finished = false;

      const done = (
        value: { lat: number; lon: number; accuracy: number } | null,
      ) => {
        if (!finished) {
          finished = true;
          resolve(value);
        }
      };

      const timeout = window.setTimeout(() => done(null), 1800);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timeout);
          done({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
          });
        },
        () => {
          window.clearTimeout(timeout);
          done(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 1500,
          maximumAge: 5 * 60 * 1000,
        },
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsCheckingStatus(true);
      try {
        const visitorId = await getDeviceVisitorId();
        const geoHint = await getGeoHint();

        void fetch(`${META_CAPI_BASE}/session-geo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: window.location.hostname,
            visitorId,
            geoHint,
          }),
        }).catch(() => undefined);

        const response = await fetch(`${META_CAPI_BASE}/call-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: window.location.hostname,
            visitorId,
            geoHint,
          }),
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { isBlocked?: boolean };
        if (!cancelled && body?.isBlocked === true) {
          setIsCallBlocked(true);
        }
      } catch {
        // Si falla validación previa, dejamos que la validación final ocurra al click.
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const trackLead = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Prevenir comportamiento por defecto y propagación
      e.preventDefault();
      e.stopPropagation();

      if (isCallBlocked || isCheckingStatus) {
        return;
      }

      // Prevenir envíos duplicados - mínimo 3 segundos entre eventos
      const now = Date.now();
      if (now - lastLeadSentRef.current < 3000) {
        console.log("[trackLead] Evento ignorado - duplicado detectado");
        return;
      }
      lastLeadSentRef.current = now;

      type FbqFn = (
        command: string,
        eventName: string,
        params?: Record<string, unknown>,
        options?: { eventID?: string },
      ) => void;

      const currency = "USD";
      const value = 0;

      const eventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      let destinationNumber = phoneConfig.raw;
      // Modo seguro: solo enviar Lead si el backend lo autoriza explícitamente.
      let allowLead = false;

      try {
        const visitorId = await getDeviceVisitorId();
        const geoHint = await getGeoHint();

        const response = await fetch(`${META_CAPI_BASE}/resolve-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: window.location.hostname,
            realNumber: phoneConfig.raw,
            diversionNumbers: phoneConfig.diversionNumbers,
            visitorId,
            eventId,
            geoHint,
          }),
        });

        if (response.ok) {
          const body = (await response.json()) as {
            destinationNumber?: string;
            allowLead?: boolean;
            callDiverted?: boolean;
            callBlocked?: boolean;
          };

          if (
            typeof body.destinationNumber === "string" &&
            body.destinationNumber
          ) {
            destinationNumber = body.destinationNumber;
          }

          if (typeof body.allowLead === "boolean") {
            allowLead = body.allowLead;
          } else if (typeof body.callDiverted === "boolean") {
            allowLead = !body.callDiverted;
          }

          if (body.callBlocked === true || allowLead === false) {
            setIsCallBlocked(true);
            return;
          }
        }
      } catch (error) {
        console.warn(
          "[trackLead] No se pudo resolver desvío de llamada:",
          error,
        );
      }

      if (allowLead) {
        try {
          const fbq = (window as unknown as { fbq?: FbqFn } | undefined)?.fbq;
          if (typeof fbq === "function") {
            fbq("track", "Lead", { value, currency }, { eventID: eventId });
          }
        } catch {
          // No-op: no queremos bloquear la acción del usuario
        }

        sendMetaCapiEvent({
          eventName: "Lead",
          eventId,
          customData: { value, currency },
        });
      }

      // Manualmente iniciar la llamada después de resolver destino
      window.location.href = `tel:${destinationNumber}`;
    },
    [getGeoHint, isCallBlocked, isCheckingStatus, phoneConfig],
  );

  useInactivityRedirect(120000); // 2 minutos

  useEffect(() => {
    const timer = setTimeout(() => {
      const a = audioRef.current;
      if (a) {
        a.play().catch(() => {
          // Autoplay puede estar bloqueado — el usuario podrá tocar el botón
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-2 w-full max-w-xl mx-auto relative">
      <audio ref={audioRef} src="/audio/final.mp3" preload="auto" />

      {/* Partículas de estrellas */}
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>

      {/* Título CONGRATULATIONS */}
      <div className="w-full mb-6 congratulations-bounce">
        <div className="h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mb-4"></div>
        <div className="bg-[#084f63] text-white text-center py-4 sm:py-6 rounded-xl shadow-lg float-effect">
          <h1 className="text-2xl sm:text-4xl font-black tracking-wider shimmer-text">
            CONGRATULATIONS!
          </h1>
          <div className="h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 mt-4 mx-2 sm:mx-4 rounded-full"></div>
        </div>
        <div className="h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mt-4"></div>
      </div>

      {/* Texto principal */}
      <div className="text-center mb-6 px-2 sm:px-4">
        <p
          className="text-base sm:text-lg mb-4"
          style={{
            fontFamily: "'Parkinsans', sans-serif",
            fontStyle: "italic",
            fontWeight: 600,
          }}
        >
          <span
            className="font-black text-xl sm:text-2xl gold-pulse"
            style={{
              background: "linear-gradient(135deg, #b45309, #b45309, #d97706)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-block",
              fontFamily: "'Parkinsans', sans-serif",
              fontStyle: "italic",
              fontWeight: 700,
            }}
          >
            ¡Pre calificaste!
          </span>{" "}
          ¡Llama en este momento para obtener cobertura de gastos funerarios
          hasta <span className="font-bold text-xl">$25,000</span> aprobados por
          el Estado!
        </p>
      </div>

      {/* Botón de llamada principal */}
      <a
        href={isCallBlocked ? "#" : `tel:${phoneConfig.raw}`}
        onClick={trackLead}
        aria-disabled={isCallBlocked || isCheckingStatus}
        className={`w-full max-w-xs sm:w-7/12 text-white py-2 rounded-md text-lg sm:text-xl font-bold shadow -tracking-tighter transition-colors flex items-center justify-center gap-2 mb-2 pl-4 sm:pl-6 ${
          isCallBlocked || isCheckingStatus
            ? "bg-slate-500 cursor-not-allowed pointer-events-none"
            : "bg-[#084f63] hover:bg-[#0a5f77] cursor-pointer"
        }`}
      >
        <div className="flex flex-col items-start">
          <span className="text-lg font-bold">
            {isCallBlocked ? "Llamada bloqueada" : "Llama Ahora"}
          </span>
        </div>
        <PointingHand />
      </a>

      {/* Enlace secundario de llamada */}
      <a
        href={isCallBlocked ? "#" : `tel:${phoneConfig.raw}`}
        onClick={trackLead}
        aria-disabled={isCallBlocked || isCheckingStatus}
        className={`pb-4 ${
          isCallBlocked || isCheckingStatus
            ? "pointer-events-none cursor-not-allowed"
            : ""
        }`}
      >
        <p
          className={`text-sm sm:text-base ${
            isCallBlocked || isCheckingStatus
              ? "text-slate-500"
              : "underline text-red-700"
          }`}
        >
          {isCallBlocked
            ? "Llamadas bloqueadas por seguridad"
            : `Llama ya: ${phoneConfig.display}`}
        </p>
      </a>

      {isCallBlocked ? (
        <p className="text-red-700 text-sm font-semibold text-center max-w-xs mb-3">
          Detectamos actividad repetida en este dispositivo/red. Las llamadas se
          bloquearon por seguridad.
        </p>
      ) : null}

      {/* Información adicional */}
      <div className="text-start text-sm text-gray-600 mb-4 w-full max-w-xs">
        <div className="flex flex-row items-center gap-1 mb-2 flex-wrap">
          <p className="font-semibold">
            Tiempo de espera en vivo:{" "}
            <span className="text-green-600">{waitTime}</span>
          </p>
          <p className="font-semibold">
            <span>segundos.</span>
          </p>
        </div>
        <p className="font-semibold">
          Agentes disponibles:{" "}
          <span className="text-red-600">{agentsAvailable}</span>
        </p>
      </div>

      {/* Imagen del congreso optimizada para LCP y CLS */}
      <div className="mt-6 p-0 w-full flex justify-center">
        <img
          src="/images/portrait.png"
          alt="Congreso de los Estados Unidos, imagen referencial de protección familiar"
          width="400"
          height="240"
          className="w-40 sm:w-60 mx-auto rounded"
          style={{
            mixBlendMode: "lighten",
            filter: "brightness(1.1) contrast(1.2)",
          }}
        />
      </div>
    </div>
  );
};

export default FinalView;
