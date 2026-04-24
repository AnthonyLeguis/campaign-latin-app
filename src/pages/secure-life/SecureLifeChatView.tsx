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
    introAnswer,
    introDisabled,
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

      <main className="secure-life-surface mx-auto w-full max-w-[520px] px-4 py-5 pb-12 sm:px-5">
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
      </main>
    </div>
  );
};
