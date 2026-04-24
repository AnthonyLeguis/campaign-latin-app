type SecureLifeIntroStepProps = {
  introAnswer: string;
  introDisabled: boolean;
  onIntroChoice: (choice: string) => void;
};

export const SecureLifeIntroStep = ({
  introAnswer,
  introDisabled,
  onIntroChoice,
}: SecureLifeIntroStepProps) => {
  return (
    <div className="secure-life-step chat-block mb-4 rounded-[28px] p-1">
      <div className="name-tag mb-2 ml-12 text-[11px] font-bold tracking-[0.28em] text-[#0f4f91] uppercase">
        Sophia · Secure Life
      </div>
      <div className="msg-row flex items-end gap-2.5">
        <div className="chat-avatar avatar flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-[15px] font-extrabold text-white">
          S
        </div>
        <div className="chat-bubble agent max-w-[76%] rounded-[20px] rounded-bl-[4px] px-4 py-3 text-[15px] leading-[1.6] text-slate-900">
          Hola 👋
          <br />
          Soy Sophia de Secure Life
        </div>
      </div>
      <div className="spacer-sm h-1.5" />
      <div className="msg-row flex items-end gap-2.5">
        <div className="chat-avatar avatar flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-[15px] font-extrabold text-white">
          S
        </div>
        <div className="chat-bubble agent max-w-[76%] rounded-[20px] rounded-bl-[4px] px-4 py-3 text-[15px] leading-[1.6] text-slate-900">
          ¿Quieres saber si calificas para un beneficio funerario de hasta{" "}
          <strong>$25,000</strong>? ¡Toca Sí! 😃
        </div>
      </div>

      <div className="options-row mt-3 flex flex-wrap gap-2.5 pl-12">
        <button
          type="button"
          onClick={() => onIntroChoice("Sí")}
          disabled={introDisabled}
          className={`opt-btn rounded-full px-5 py-2.5 text-[15px] font-bold text-white transition duration-150 ${introDisabled && introAnswer === "Sí" ? "selected cursor-default bg-[#42A5F5]" : "cursor-pointer bg-gradient-to-r from-[#0f4f91] via-[#1565C0] to-[#0b3666] hover:brightness-105 active:scale-[0.98]"}`}
        >
          Sí
        </button>
      </div>
    </div>
  );
};
