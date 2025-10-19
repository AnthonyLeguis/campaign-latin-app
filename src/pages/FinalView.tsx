import { useEffect, useRef } from 'react';
import { PointingHand } from '../components/PointingHand';

export const FinalView = ({ waitTime = 0, agentsAvailable = 5 }: { waitTime?: number; agentsAvailable?: number } = {}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            const a = audioRef.current;
            if (a) {
                a.play().catch(() => {
                    // Autoplay puede estar bloqueado — el usuario podrá tocar el botón
                });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handlePopState = () => {
            window.history.pushState(null, '', window.location.pathname);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-2">
            <audio ref={audioRef} src="/audio/final.mp3" preload='auto' />

            {/* Título CONGRATULATIONS */}
            <div className="w-full mb-6">
                <div className="h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mb-4"></div>
                <div className="bg-[#084f63] text-white text-center py-6 rounded-xl shadow-lg">
                    <h1 className="text-4xl font-black tracking-wider">CONGRATULATIONS!</h1>
                    <div className="h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 mt-4 mx-4 rounded-full"></div>
                </div>
                <div className="h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mt-4"></div>
            </div>

            {/* Texto principal */}
            <div className="text-center mb-6 px-4">
                <p className="text-lg mb-4">
                    <span className="font-bold">¡Pre calificaste!</span> ¡Llama en este momento para obtener cobertura de gastos funerarios hasta <span className="font-bold text-xl">$30,000</span> aprobados por el Estado!
                </p>
            </div>

            {/* Botón de llamada */}
            <a
                href="tel:+14696944955"
                className="w-7/12 bg-[#084f63] text-white py-2 rounded-md text-xl font-bold shadow -tracking-tighter hover:bg-[#0a5f77] transition-colors cursor-pointer flex items-center justify-center gap-2 mb-2 pl-6"
            >
                <span className="text-lg mr-2 animate-pulse duration-75">📞</span>
                <div className="flex flex-col items-start">
                    <span className="text-lg font-bold">Llama Ahora</span>
                </div>
                <PointingHand />
            </a>
            <a href="tel:8889044955" className='pb-4'>
                <p className='underline text-red-700'>Llama ya: (888)904-4955</p>
            </a>

            {/* Información adicional */}
            <div className="text-start text-sm text-gray-600 mb-4">
                <div className="flex flex-row items-center gap-1 mb-2">
                    <p className='font-semibold'>Tiempo de espera en vivo: <span className="text-green-600">{waitTime}</span></p>
                    <p className='font-semibold'><span>minutos.</span></p>
                </div>
                <p className="font-semibold">Agentes disponibles: <span className="text-red-600">{agentsAvailable}</span></p>
            </div>

            {/* Imagen del congreso */}
            <div className="mt-6 p-0">
                <img src="/images/portrait.png" alt="US Capitol" className="w-60 mx-auto" />
            </div>
        </div>
    );
}

export default FinalView;

