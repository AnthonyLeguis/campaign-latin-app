type SecureLifeHeaderProps = {
  closingDay: string;
  stateDisplay: string;
};

export const SecureLifeHeader = ({
  closingDay,
  stateDisplay,
}: SecureLifeHeaderProps) => {
  return (
    <header className="secure-life-surface mx-auto w-full max-w-[520px] px-4 pt-4 sm:px-5">
      <div className="secure-life-panel overflow-hidden rounded-[28px] px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f4f91] shadow-sm">
              Secure Life
            </div>
            <h1 className="mt-3 max-w-2xl text-[clamp(19px,5vw,28px)] font-extrabold leading-[1.25] text-[#0b3666]">
              Recién Anunciado En{" "}
              <span className="text-[#0f4f91]">{stateDisplay}</span>: Hasta
              $25,000 Para Cubrir Gastos De Entierro Y Funeral
            </h1>
          </div>

          <div className="hidden shrink-0 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg sm:block">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4f91] via-[#1565C0] to-[#0b3666] text-white shadow-[0_12px_30px_rgba(15,79,145,0.28)]">
              <span className="text-lg font-black leading-none">S</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="status-chip inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold tracking-wide">
            Sophia está en línea ahora
          </div>
          <div className="rounded-full border border-white/70 bg-white/55 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm">
            Advertencia: la inscripción cierra el {closingDay} a medianoche.
          </div>
        </div>
      </div>
    </header>
  );
};
