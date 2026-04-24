import { AttackOnlineView } from "./pages/AttackOnlineView";
import { LegalView } from "./pages/LegalView";
import { NotAble } from "./pages/NotAble";
import { SecureLifeChatView } from "./pages/secure-life";
import { useNavigation } from "./context/NavigationContext";
import { GlobalFooter } from "./components/GlobalFooter";
import { DataClientsView } from "./pages/DataClientsView";

function App() {
  const path =
    typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
  const { currentView } = useNavigation();
  const normalizedPath = path.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/attack-online") {
    return <AttackOnlineView />;
  }

  if (normalizedPath === "/clients-data") {
    return <DataClientsView />;
  }

  const renderScreen = () => {
    switch (currentView) {
      case "legal":
        return <LegalView />;
      case "no":
        return <NotAble />;
      case "secure-life":
      default:
        return <SecureLifeChatView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{renderScreen()}</div>
      <GlobalFooter />
    </div>
  );
}

export default App;
