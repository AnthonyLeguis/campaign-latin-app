import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PointingHand } from '../components/PointingHand';

export const View3 = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const navigate = useNavigate();

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
            <audio ref={audioRef} src="/audio/view3.mp3" preload='auto' />
            <div className="text-center mb-6">
                <div className="text-xs text-gray-700 mb-1">2 de 2</div>
                <h2 className="text-2xl font-bold mb-6">¿Tienes más de 40 años?</h2>
            </div>
            <button
                onClick={() => navigate("/final")}
                className="w-full bg-[#084f63] text-white py-3 rounded-md text-lg font-bold shadow -tracking-tighter hover:bg-[#0a5f77] transition-colors cursor-pointer flex items-center justify-center gap-2 mb-3 pl-6"
            >
                <span className="text-2xl mr-2">✔</span>
                <span>Si</span>
                <PointingHand />
            </button>
            <button
                onClick={() => navigate("/no")}
                className="w-full border-2 border-[#084f63] text-[#084f63] py-3 rounded-md text-lg font-bold shadow-sm -tracking-tighter hover:bg-[#e5e7eb] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
                <span className="text-2xl mr-2">✖</span>
                <span>No</span>
            </button>
        </div>
    );
}
