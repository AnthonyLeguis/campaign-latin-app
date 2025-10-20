import { useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { PointingHand } from '../components/PointingHand';
import { useInactivityRedirect } from '../hooks/useInactivityRedirect';

export const View2 = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { navigate } = useNavigation();

    useInactivityRedirect(120000); // 2 minutos

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

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-2">
            <audio ref={audioRef} src="/audio/view2.mp3" preload='auto' />
            <div className="text-center mb-6">
                <div className="text-xs text-gray-700 mb-1">1 de 2</div>
                <h2 className="text-2xl font-bold mb-6">¿Vives en los Estados Unidos?</h2>
            </div>
            <button
                onClick={() => navigate("view3")}
                className="w-full bg-[#084f63] text-white py-3 rounded-md text-lg font-bold shadow -tracking-tighter hover:bg-[#0a5f77] transition-colors cursor-pointer flex items-center justify-center gap-2 mb-3 pl-6"
            >
                <span className="text-2xl mr-2">✔</span>
                <span>Si</span>
                <PointingHand />
            </button>
            <button
                onClick={() => navigate("no")}
                className="w-full border-2 border-[#084f63] text-[#084f63] py-3 rounded-md text-lg font-bold shadow-sm -tracking-tighter hover:bg-[#e5e7eb] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
                <span className="text-2xl mr-2">✖</span>
                <span>No</span>
            </button>
        </div>
    );
}
