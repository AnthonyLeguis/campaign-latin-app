import React from 'react'

interface PointingHandProps {
    className?: string
    size?: 'small' | 'medium' | 'large'
}

export const PointingHand: React.FC<PointingHandProps> = ({
    className = '',
    size = 'medium'
}) => {
    const sizeClasses = {
        small: 'w-6 h-6',
        medium: 'w-10 h-10',
        large: 'w-14 h-14'
    }

    return (
        <div className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
            <img
                src="/images/hand.gif"
                alt="Pointing hand"
                className="w-full h-full object-contain"
                style={{
                    filter: 'invert(1) brightness(2)',
                    mixBlendMode: 'screen'
                }}
            />
        </div>
    )
}
