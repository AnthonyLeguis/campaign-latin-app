import { useEffect, useRef } from "react";
import { useNavigation } from "../context/NavigationContext";

type InactivityRedirectOptions = {
  onTimeout?: () => void;
};

export function useInactivityRedirect(
  timeoutMs: number = 120000,
  options?: InactivityRedirectOptions,
) {
  const { navigate } = useNavigation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (options?.onTimeout) {
          options.onTimeout();
          return;
        }

        navigate("secure-life");
      }, timeoutMs);
    };

    // Eventos que consideramos como actividad
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // Inicializa el timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate, options, timeoutMs]);
}
