import React from 'react'

// activacion del children element para declararlo en App.tsx
interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {

    return (
        <div
            className='min-h-screen flex flex-col relative'
            style={{
                backgroundImage: "url('/images/map.svg')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "60% center",
            }}
        >
            {/* Gradiente lineal descendente con transparencia de rojo a azul */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{
                    background: "linear-gradient(to bottom, rgba(185, 28, 28, 0.8), rgba(3, 7, 30, 0.8), rgba(3, 7, 30, 1))",
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
                                    background: '#d90429',
                                    transform: 'skewX(-18deg) translateY(-5px) translateX(7px)',
                                    letterSpacing: '2px',
                                    zIndex: 2,
                                    borderTopLeftRadius: '4px',
                                    borderBottomLeftRadius: '4px',
                                }}
                            >BREAKING</span>
                            {/* NEWS (azul, recto, más grande) */}
                            <span
                                className="font-extrabold text-white px-6 py-2 text-lg md:text-2xl shadow-lg underline"
                                style={{
                                    background: '#003566',
                                    transform: 'skewX(-18deg) translateY(-5px)',
                                    marginLeft: '-6px',
                                    borderTopRightRadius: '4px',
                                    borderBottomRightRadius: '4px',
                                    zIndex: 1,
                                }}
                            >NEWS</span>
                        </div>
                        {/* Titular Principal */}
                        <h1 className="font-bold text-shadow-lg text-shadow-gray-950 text-center leading-tight transition-all duration-300 text-sm md:text-medium">
                            ¡El Congreso ha revelado un inédito esquema regulado que protege con hasta $30,000 los desembolsos relacionados con servicios funerarios!
                        </h1>
                    </div>
                </header>
                {/* Main Content */}
                <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
                    <div className="pb-20 bg-white/90 bg-opacity-90 rounded-xl shadow-lg p-6 min-h-[50vh]">
                        {children}
                    </div>
                </main>
                {/* Footer con Disclaimer */}
                <footer className="w-full text-white mt-8 py-6">
                    <div className="max-w-2xl mx-auto px-4">
                        {/* Disclaimer Text */}
                        <div className="text-justify text-gray-700 text-xs leading-relaxed mb-6 border-t border-gray-700 pt-4">
                            <p className="mb-3">
                                We are a marketing company. This Site is part of our marketing efforts for third-parties. The offers that are discussed or appear on our website are from third party advertisers who compensate us. This compensation may impact how and where products appear on our website and the order in which they appear. The compensation that we get may also influence the topic, posts, and content on our Site this website. We do not represent all services or products available on the market. Editorial opinions expressed on the Site are strictly our own, and are not provided, endorsed, or approved by advertisers. We are not affiliated with any third party advertiser other than as stated above. As such, we do not recommend or endorse any product or service on this website. If you are redirected to a third party advertiser's site, you should review their terms and conditions and privacy policy as they may differ significantly from those posted on this site.
                            </p>
                            <p>
                                By placing this call you are agreeing that the phone number you're calling from may be contacted by our marketing partners regarding your inquiry and with related offers, by phone call or text message. Msg. and data rates apply. You are not required to opt in as a condition of purchase.
                            </p>
                        </div>
                        {/* Links Section */}
                        <div className="text-center text-xs border-t border-gray-700 pt-4 space-y-2">
                            <div className="flex justify-center gap-2 flex-wrap">
                                <a
                                    href="https://supersubsidy.com/privacy.php"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                >
                                    Privacy Policy
                                </a>
                                <span className="text-gray-500">|</span>
                                <a
                                    href="https://supersubsidy.com/terms.php"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                >
                                    Terms of Service
                                </a>
                            </div>
                            <p className="text-gray-700 mt-3">© 2025 Protección para la familia. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}

