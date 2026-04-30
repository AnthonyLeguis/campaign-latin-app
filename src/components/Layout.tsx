import React from "react";
import { useNavigation } from "../context/NavigationContext";

// activacion del children element para declararlo en App.tsx
interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { navigate } = useNavigation();

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "url('/images/mmm.png')",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* Gradiente lineal descendente con transparencia de rojo a azul */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background:
            "linear-gradient(to bottom, rgba(185, 28, 28, 0.8), rgba(3, 7, 30, 0.8), rgba(3, 7, 30, 1))",
          zIndex: 0,
        }}
      />

      <div className="min-h-screen flex-1 flex flex-col sm:w-7/12 mx-auto transition-all duration-300 relative z-10">
        {/* Header */}
        <header className="w-full text-gray-100 top-0 py-3">
          <div className="max-w-2xl mx-auto px-4">
            {/* Badge de Últimas Noticias */}
            <div className="flex items-center justify-center gap-0 mb-3 transition-all duration-300">
              {/* BREAKING (rojo, inclinado, más pequeño) */}
              <span
                className="font-extrabold text-white px-4 py-2 text-sm md:text-base shadow-lg"
                style={{
                  background: "#d90429",
                  transform: "skewX(-18deg) translateY(-5px) translateX(7px)",
                  letterSpacing: "2px",
                  zIndex: 2,
                  borderTopLeftRadius: "4px",
                  borderBottomLeftRadius: "4px",
                }}
              >
                BREAKING
              </span>
              {/* NEWS (azul, recto, más grande) */}
              <span
                className="font-extrabold text-white px-6 py-2 text-lg md:text-2xl shadow-lg underline"
                style={{
                  background: "#003566",
                  transform: "skewX(-18deg) translateY(-5px)",
                  marginLeft: "-6px",
                  borderTopRightRadius: "4px",
                  borderBottomRightRadius: "4px",
                  zIndex: 1,
                }}
              >
                NEWS
              </span>
            </div>
            {/* Titular Principal */}
            <h1 className="font-bold text-shadow-lg text-shadow-gray-950 text-center leading-tight transition-all duration-300 text-sm md:text-medium">
              ¡El Congreso dio a conocer un nuevo programa regulado que brinda
              protección de hasta $25,000 para cubrir gastos vinculados a
              servicios funerarios!
            </h1>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
          <div className="pb-20 bg-white/70 bg-opacity-90 rounded-xl shadow-lg p-6 min-h-[50vh]">
            {children}
          </div>
        </main>
        {/* Footer con Disclaimer */}
        <footer className="w-full text-white mt-8 py-6">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center text-gray-200 text-xs leading-relaxed border-t border-gray-700 pt-4 space-y-3">
              <p>© 2026 Latin Group Insurance. All rights reserved.</p>
              <p>
                This website is not affiliated with or endorsed by any
                government agency. We are a licensed insurance agency offering
                insurance products.
              </p>
              <p>
                By submitting your information, you agree to be contacted by a
                licensed agent via phone, text message, or email.
              </p>
              <p>
                <button
                  type="button"
                  onClick={() => navigate("legal")}
                  className="underline text-blue-300 hover:text-blue-200 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>{" "}
                |{" "}
                <button
                  type="button"
                  onClick={() => navigate("legal")}
                  className="underline text-blue-300 hover:text-blue-200 transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
