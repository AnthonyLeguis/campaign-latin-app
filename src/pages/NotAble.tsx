import { useInactivityRedirect } from "../hooks/useInactivityRedirect";
import { useNavigation } from "../context/NavigationContext";

export const NotAble = () => {
  const { navigate } = useNavigation();

  useInactivityRedirect(120000); // 2 minutos

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-2">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-6">
          Lamentablemente, las respuestas que ha proporcionado indican que no
          podemos ayudarle en esta ocasión. <br /> ¡Gracias por su tiempo!
        </h2>
        <button
          type="button"
          onClick={() => navigate("secure-life")}
          className="bg-[#084f63] text-white py-2 px-6 rounded-md text-sm font-bold hover:bg-[#0a5f77] transition-colors cursor-pointer"
        >
          Volver al chat
        </button>
      </div>
    </div>
  );
};
