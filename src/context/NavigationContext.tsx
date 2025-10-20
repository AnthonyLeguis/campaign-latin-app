import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type ViewType = 'view1' | 'view2' | 'view3' | 'final' | 'no';

interface NavigationContextType {
    currentView: ViewType;
    navigate: (view: ViewType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
    children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
    const [currentView, setCurrentView] = useState<ViewType>('view1');

    const navigate = (view: ViewType) => {
        setCurrentView(view);
    };

    return (
        <NavigationContext.Provider value={{ currentView, navigate }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation debe usarse dentro de NavigationProvider');
    }
    return context;
};
