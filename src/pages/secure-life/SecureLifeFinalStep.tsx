import type { RefObject } from "react";

type SecureLifeFinalStepProps = {
  finalSectionRef: RefObject<HTMLDivElement | null>;
  isCallBlocked: boolean;
  isCheckingStatus: boolean;
  onCall: () => void;
  selectedAge: string;
  showFinalMessage: boolean;
  showFinalTyping: boolean;
};

export const SecureLifeFinalStep = ({
  finalSectionRef,
  isCallBlocked,
  isCheckingStatus,
  onCall,
  selectedAge,
  showFinalMessage,
  showFinalTyping,
}: SecureLifeFinalStepProps) => {
  if (!selectedAge) {
    return null;
  }

  return (
    <div
      className="secure-life-step chat-block mb-4 chat-pop-slow rounded-[28px] p-1"
      ref={finalSectionRef}
    >
      <div className="msg-row user flex flex-row-reverse items-end gap-2.5">
        <div className="chat-bubble user ml-auto max-w-[76%] rounded-[20px] rounded-br-[4px] px-4 py-3 text-[15px] leading-[1.6] text-white">
          {selectedAge}
        </div>
      </div>

      <div className="spacer h-2.5" />

      {showFinalTyping ? (
        <div className="msg-row flex items-end gap-2.5">
          <div className="chat-avatar avatar flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-[15px] font-extrabold text-white">
            S
          </div>
          <div className="typing flex w-fit items-center gap-1.5 rounded-[18px] rounded-bl-[4px] border border-[#d7e8f8] bg-white/90 px-4 py-3 shadow-[0_1px_4px_rgba(21,101,192,0.1)] backdrop-blur-sm">
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1565C0]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1565C0] [animation-delay:0.2s]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1565C0] [animation-delay:0.4s]" />
          </div>
        </div>
      ) : null}

      {showFinalMessage ? (
        <div className="chat-pop">
          <div className="name-tag mb-2 ml-12 mt-2 text-[11px] font-bold tracking-[0.28em] text-[#0f4f91] uppercase">
            Sophia · Secure Life
          </div>
          <div className="msg-row flex items-end gap-2.5">
            <div className="chat-avatar avatar flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-[15px] font-extrabold text-white">
              S
            </div>
            <div className="chat-bubble agent max-w-[76%] rounded-[20px] rounded-bl-[4px] px-4 py-3 text-[15px] leading-[1.6] text-slate-900">
              <div className="mb-2 text-center text-xl tracking-[0.28em] text-[#0b3666]">
                🎉 ¡Felicidades! 🎁
              </div>
              Toca el botón de abajo para llamar ahora y obtener tu beneficio
              funerario de <strong>$25,000</strong>. ¡Solo toma 2 minutos!
            </div>
          </div>

          <button
            type="button"
            onClick={onCall}
            disabled={isCallBlocked || isCheckingStatus}
            className={`chat-pulse mx-auto mt-4 flex w-full max-w-[360px] items-center justify-center gap-3 rounded-[18px] px-5 py-4 text-[21px] font-extrabold tracking-[0.08em] text-white transition-all duration-300 ${isCallBlocked || isCheckingStatus ? "cursor-not-allowed bg-slate-500" : "bg-gradient-to-r from-[#2E7D32] via-[#35a24a] to-[#1B5E20] hover:scale-[1.015]"}`}
          >
            📞 <span>Llamar ahora</span>
          </button>

          <div className="mx-auto mt-3 max-w-[360px] text-center text-[11px] leading-[1.65] text-[#5C7FA8]">
            Al llamar, acepta recibir asistencia de agentes con licencia.
            <br />
            Servicio gratuito para residentes elegibles.
          </div>
        </div>
      ) : null}
    </div>
  );
};
