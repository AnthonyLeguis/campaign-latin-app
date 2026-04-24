import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation } from "../../context/NavigationContext";
import { useInactivityRedirect } from "../../hooks/useInactivityRedirect";
import { getDeviceVisitorId } from "../../lib/deviceFingerprint";
import { META_CAPI_BASE } from "../../lib/metaCapi";
import { formatClosingDay, formatPhoneLabel } from "./secureLifeUtils";

type FbqFn = (
  command: string,
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
) => void;

export function useSecureLifeController() {
  const { navigate } = useNavigation();
  const [closingDay, setClosingDay] = useState("");
  const [stateDisplay] = useState("Texas");
  const [phoneRaw, setPhoneRaw] = useState("+14696637105");
  const [introAnswer, setIntroAnswer] = useState("");
  const [introDisabled, setIntroDisabled] = useState(false);
  const [showAgeTyping, setShowAgeTyping] = useState(false);
  const [showAgePrompt, setShowAgePrompt] = useState(false);
  const [selectedAge, setSelectedAge] = useState("");
  const [showFinalTyping, setShowFinalTyping] = useState(false);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [isCallBlocked, setIsCallBlocked] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const lastLeadSentRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const ageSectionRef = useRef<HTMLDivElement | null>(null);
  const finalSectionRef = useRef<HTMLDivElement | null>(null);

  useInactivityRedirect(120000, {
    onTimeout: () => {
      window.location.reload();
    },
  });

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    const timerId = window.setTimeout(fn, delayMs);
    timersRef.current.push(timerId);
    return timerId;
  }, []);

  useEffect(() => {
    setClosingDay(formatClosingDay(new Date()));
  }, []);

  useEffect(() => {
    document.title = `Secure Life – Beneficio Funerario en ${stateDisplay || "Texas"}`;
  }, [stateDisplay]);

  useEffect(() => {
    fetch("/config.json")
      .then((response) => response.json())
      .then((data) => {
        if (typeof data?.phoneRaw === "string" && data.phoneRaw.trim()) {
          setPhoneRaw(data.phoneRaw.trim());
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadGeo = async () => {
      try {
        const visitorId = await getDeviceVisitorId();

        void fetch(`${META_CAPI_BASE}/session-geo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: window.location.hostname,
            visitorId,
          }),
        }).catch(() => undefined);

        const response = await fetch(`${META_CAPI_BASE}/call-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: window.location.hostname,
            visitorId,
          }),
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { isBlocked?: boolean };

        if (!cancelled && body?.isBlocked === true) {
          setIsCallBlocked(true);

          void fetch(`${META_CAPI_BASE}/blocked-entry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain: window.location.hostname,
              visitorId,
            }),
          }).catch(() => undefined);
        }
      } catch {
        // Si falla la validación previa, la llamada se resolverá al click.
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false);
          setIsLoadingLocation(false);
        }
      }
    };

    void loadGeo();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (showAgePrompt) {
      ageSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [showAgePrompt]);

  useEffect(() => {
    if (showFinalMessage) {
      finalSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [showFinalMessage]);

  const handleIntroChoice = useCallback(
    (choice: string) => {
      if (introDisabled) {
        return;
      }

      if (choice === "No") {
        setIntroDisabled(true);
        navigate("no");
        return;
      }

      setIntroDisabled(true);
      setIntroAnswer(choice);
      setShowAgeTyping(true);

      schedule(() => {
        setShowAgeTyping(false);
        setShowAgePrompt(true);
      }, 3000);
    },
    [introDisabled, navigate, schedule],
  );

  const handleAgeChoice = useCallback(
    (age: string) => {
      if (!showAgePrompt || selectedAge) {
        return;
      }

      setSelectedAge(age);
      setShowFinalTyping(true);

      schedule(() => {
        setShowFinalTyping(false);
        setShowFinalMessage(true);
      }, 3000);
    },
    [schedule, selectedAge, showAgePrompt],
  );

  const handleCall = useCallback(async () => {
    if (isCallBlocked || isCheckingStatus) {
      return;
    }

    const now = Date.now();
    if (now - lastLeadSentRef.current < 3000) {
      return;
    }
    lastLeadSentRef.current = now;

    const currency = "USD";
    const value = 0;

    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let destinationNumber = phoneRaw;
    let allowLead = false;

    try {
      const visitorId = await getDeviceVisitorId();

      const response = await fetch(`${META_CAPI_BASE}/resolve-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: window.location.hostname,
          realNumber: phoneRaw,
          visitorId,
          eventId,
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
    } catch {
      // Si el backend no responde, dejamos continuar con el número configurado.
    }

    if (allowLead) {
      try {
        const fbq = (window as unknown as { fbq?: FbqFn } | undefined)?.fbq;
        if (typeof fbq === "function") {
          fbq("track", "Lead", { value, currency }, { eventID: eventId });
        }
      } catch {
        // No bloqueamos la acción del usuario por fallos del píxel.
      }
    }

    window.location.href = `tel:${destinationNumber}`;
  }, [isCallBlocked, isCheckingStatus, phoneRaw]);

  return {
    ageSectionRef,
    closingDay,
    currentPhoneLabel: formatPhoneLabel(phoneRaw),
    finalSectionRef,
    handleAgeChoice,
    handleCall,
    handleIntroChoice,
    introAnswer,
    introDisabled,
    isCallBlocked,
    isCheckingStatus,
    isLoadingLocation,
    selectedAge,
    showAgePrompt,
    showAgeTyping,
    showFinalMessage,
    showFinalTyping,
    stateDisplay,
  };
}
