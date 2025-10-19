import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface AnimatedRoutesProps {
    children: React.ReactNode;
}

export const AnimatedRoutes: React.FC<AnimatedRoutesProps> = ({ children }) => {
    const location = useLocation();
    const [displayLocation, setDisplayLocation] = useState(location);
    const [transitionStage, setTransitionStage] = useState<'enter' | 'exit' | 'none'>('none');

    useEffect(() => {
        if (location.pathname !== displayLocation.pathname) {
            setTransitionStage('exit');
        }
    }, [location, displayLocation]);

    const handleAnimationEnd = () => {
        if (transitionStage === 'exit') {
            setDisplayLocation(location);
            setTransitionStage('enter');
        } else if (transitionStage === 'enter') {
            setTransitionStage('none');
        }
    };

    // View1 no tiene animación de entrada, solo de salida
    const isView1 = displayLocation.pathname === '/';
    const animationClass = transitionStage === 'exit'
        ? 'view-exit'
        : (transitionStage === 'enter' && !isView1)
            ? 'view-enter'
            : '';

    return (
        <div
            className={animationClass}
            onAnimationEnd={handleAnimationEnd}
        >
            {children}
        </div>
    );
};

export default AnimatedRoutes;