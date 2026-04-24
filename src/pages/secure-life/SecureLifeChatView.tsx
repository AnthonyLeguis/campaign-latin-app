import { SecureLifeAgeStep } from "./SecureLifeAgeStep";
import { SecureLifeFinalStep } from "./SecureLifeFinalStep";
import { SecureLifeHeader } from "./SecureLifeHeader";
import { SecureLifeIntroStep } from "./SecureLifeIntroStep";
import { useSecureLifeController } from "./useSecureLifeController";

export const SecureLifeChatView = () => {
  const {
    ageSectionRef,
    closingDay,
    finalSectionRef,
    handleAgeChoice,
    handleCall,
    handleIntroChoice,
    handleStartChat,
    introAnswer,
    introDisabled,
    hasStarted,
    isCallBlocked,
    isCheckingStatus,
    selectedAge,
    showAgePrompt,
    showAgeTyping,
    showFinalMessage,
    showFinalTyping,
    stateDisplay,
  } = useSecureLifeController();

  return (
    <div className="secure-life-app text-slate-900">
      <SecureLifeHeader closingDay={closingDay} stateDisplay={stateDisplay} />

      <main className="secure-life-surface mx-auto flex w-full max-w-[520px] min-h-[calc(100svh-170px)] px-4 py-5 pb-12 sm:px-5">
        {!hasStarted ? (
          <section className="flex flex-1 items-center justify-center py-8">
            <button
              type="button"
              onClick={handleStartChat}
              className="chat-pulse inline-flex min-w-[210px] items-center justify-center rounded-full bg-gradient-to-r from-[#0f4f91] via-[#1565C0] to-[#0b3666] px-8 py-4 text-[clamp(18px,4.5vw,22px)] font-extrabold tracking-[0.12em] text-white shadow-[0_18px_34px_rgba(15,79,145,0.28)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Empezar
            </button>
          </section>
        ) : (
          <section className="chat-wrapper flex flex-col">
            <SecureLifeIntroStep
              introAnswer={introAnswer}
              introDisabled={introDisabled}
              onIntroChoice={handleIntroChoice}
            />

            <SecureLifeAgeStep
              ageSectionRef={ageSectionRef}
              introAnswer={introAnswer}
              onAgeChoice={handleAgeChoice}
              selectedAge={selectedAge}
              showAgePrompt={showAgePrompt}
              showAgeTyping={showAgeTyping}
            />

            <SecureLifeFinalStep
              finalSectionRef={finalSectionRef}
              isCallBlocked={isCallBlocked}
              isCheckingStatus={isCheckingStatus}
              onCall={handleCall}
              selectedAge={selectedAge}
              showFinalMessage={showFinalMessage}
              showFinalTyping={showFinalTyping}
            />
          </section>
        )}
      </main>
    </div>
  );
};
