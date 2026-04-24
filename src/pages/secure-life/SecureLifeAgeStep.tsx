import type { RefObject } from "react";
import { ageOptions } from "./secureLifeData";

type SecureLifeAgeStepProps = {
  ageSectionRef: RefObject<HTMLDivElement | null>;
  introAnswer: string;
  onAgeChoice: (age: string) => void;
  selectedAge: string;
  showAgePrompt: boolean;
  showAgeTyping: boolean;
};

export const SecureLifeAgeStep = ({
  ageSectionRef,
  introAnswer,
  onAgeChoice,
  selectedAge,
  showAgePrompt,
  showAgeTyping,
}: SecureLifeAgeStepProps) => {
  if (!introAnswer) {
    return null;
  }

  return (
    <div
      className="secure-life-step chat-block mb-4 chat-pop-slow rounded-[28px] p-1"
      ref={ageSectionRef}
    >
      <div className="msg-row user flex flex-row-reverse items-end gap-2.5">
        <div className="chat-bubble user ml-auto max-w-[84%] rounded-[20px] rounded-br-[4px] px-4 py-3 text-[15px] leading-[1.6] text-white sm:max-w-[76%]">
          {introAnswer}
        </div>
      </div>

      <div className="spacer h-2.5" />

      {showAgeTyping ? (
        <div className="msg-row flex items-end gap-2.5">
          <div className="chat-avatar avatar flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-[14px] font-extrabold text-white sm:h-[38px] sm:w-[38px] sm:text-[15px]">
            S
          </div>
          <div className="typing flex w-fit items-center gap-1.5 rounded-[18px] rounded-bl-[4px] border border-[#d7e8f8] bg-white/90 px-4 py-3 shadow-[0_1px_4px_rgba(21,101,192,0.1)] backdrop-blur-sm">
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1565C0]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1565C0] [animation-delay:0.2s]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1565C0] [animation-delay:0.4s]" />
          </div>
        </div>
      ) : null}

      {showAgePrompt ? (
        <div className="chat-pop">
          <div className="name-tag mb-2 ml-12 mt-2 text-[11px] font-bold tracking-[0.28em] text-[#0f4f91] uppercase">
            Sophia · Secure Life
          </div>
          <div className="msg-row flex items-end gap-2.5">
            <div className="chat-avatar avatar flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-[15px] font-extrabold text-white">
              S
            </div>
            <div className="chat-bubble agent max-w-[84%] rounded-[20px] rounded-bl-[4px] px-4 py-3 text-[15px] leading-[1.6] text-slate-900 sm:max-w-[76%]">
              ¿Cuál es tu rango de edad?
            </div>
          </div>

          <div className="options-row mt-3 flex flex-wrap gap-2.5 pl-12">
            {ageOptions.map((age) => (
              <button
                key={age}
                type="button"
                onClick={() => onAgeChoice(age)}
                disabled={Boolean(selectedAge)}
                className={`opt-btn rounded-full px-5 py-2.5 text-[15px] font-bold text-white transition duration-150 ${selectedAge === age ? "selected cursor-default bg-[#42A5F5]" : "cursor-pointer bg-gradient-to-r from-[#0f4f91] via-[#1565C0] to-[#0b3666] hover:brightness-105 active:scale-[0.98]"}`}
              >
                {age}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
