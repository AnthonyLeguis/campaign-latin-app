import { useEffect } from 'react';

export const NotAble = () => {
    useEffect(() => {
        const handlePopState = () => {
            window.history.pushState(null, '', window.location.pathname);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-2">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-6">Lamentablemente, las respuestas que ha proporcionado indican que no podemos ayudarle en esta ocasión. <br /> ¡Gracias por su tiempo!</h2>
            </div>
        </div>
    );
}