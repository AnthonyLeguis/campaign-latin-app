import { useNavigation } from "../context/NavigationContext";

export const GlobalFooter = () => {
  const { currentView, navigate } = useNavigation();
  const isExitView = currentView === "legal" || currentView === "no";

  return (
    <footer className="w-full px-4 pb-6 pt-2">
      <div className="mx-auto max-w-[520px] border-t border-[#BBDEFB] pt-4 text-center text-[11px] leading-[1.7] text-[#5C7FA8]">
        <p>© 2026 Secure Life. All rights reserved.</p>
        <p>
          This website is not affiliated with or endorsed by any government
          agency. We are a licensed insurance agency offering insurance
          products.
        </p>
        <p>
          {isExitView ? (
            <button
              type="button"
              onClick={() => navigate("secure-life")}
              className="underline text-[#1565C0] hover:text-[#0D47A1] transition-colors cursor-pointer"
            >
              Volver al chat
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("legal")}
                className="underline text-[#1565C0] hover:text-[#0D47A1] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>{" "}
              |{" "}
              <button
                type="button"
                onClick={() => navigate("legal")}
                className="underline text-[#1565C0] hover:text-[#0D47A1] transition-colors cursor-pointer"
              >
                Terms & Conditions
              </button>
            </>
          )}
        </p>
      </div>
    </footer>
  );
};
