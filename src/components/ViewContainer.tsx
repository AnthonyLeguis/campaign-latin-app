import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ViewType } from '../context/NavigationContext';

interface ViewContainerProps {
    children: ReactNode;
    currentView: ViewType;
    expectedView: ViewType;
}

export const ViewContainer: React.FC<ViewContainerProps> = ({
    children,
    currentView,
    expectedView
}) => {
    const [animationClass, setAnimationClass] = React.useState('');
    const prevViewRef = React.useRef<ViewType>(expectedView);

    useEffect(() => {
        if (currentView !== prevViewRef.current) {
            // Si es la primera vista, no animar entrada
            if (prevViewRef.current === 'view1' && expectedView === 'view1') {
                setAnimationClass('');
            } else if (currentView === expectedView) {
                // Entra la nueva vista
                setAnimationClass('view-enter');
            } else {
                // Sale la vista anterior
                setAnimationClass('');
            }
            prevViewRef.current = currentView;
        }
    }, [currentView, expectedView]);

    if (currentView !== expectedView) {
        return null;
    }

    return (
        <div className={animationClass} onAnimationEnd={() => setAnimationClass('')}>
            {children}
        </div>
    );
};
