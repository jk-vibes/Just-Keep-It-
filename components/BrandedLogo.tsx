import React, { useId } from 'react';
import { Coins } from 'lucide-react';

interface BrandedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  healthStatus?: 'positive' | 'negative' | 'neutral';
  variant?: 'dynamic' | 'gold';
}

const BrandedLogo: React.FC<BrandedLogoProps> = ({ 
  size = 'sm', 
  className = '', 
  healthStatus = 'neutral',
  variant = 'dynamic'
}) => {
  const maskId = useId();
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  
  const width = isSm ? 34 : isLg ? 160 : 78;
  const height = isSm ? 32 : isLg ? 120 : 60;
  const coinSize = isSm ? 10 : isLg ? 28 : 18;

  const isGold = variant === 'gold';
  const isPositive = healthStatus === 'positive' && !isGold;
  
  // Color configuration
  const primaryColor = isGold 
    ? '#FACC15' 
    : isPositive 
      ? '#10b981' 
      : '#f43f5e';

  const coinClass = isGold
    ? 'coin-into coin-gold' 
    : isPositive 
      ? 'coin-into coin-green' 
      : 'coin-out coin-red';

  const gradientId = `logo-grad-${variant}-${healthStatus}-${maskId}`;
  const bodyPath = "M2 8C2 7.44772 2.44772 7 3 7H21C21.5523 7 22 7.44772 22 8V20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V8Z";

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width, height }}>
      <div className="absolute inset-0 pointer-events-none flex justify-center">
        <Coins className={`${coinClass} absolute`} size={coinSize} style={{ left: '15%', animationDelay: '0s' }} />
        <Coins className={`${coinClass} absolute`} size={coinSize * 0.8} style={{ left: '65%', animationDelay: '0.9s' }} />
        <Coins className={`${coinClass} absolute`} size={coinSize * 0.9} style={{ left: '40%', animationDelay: '1.6s' }} />
      </div>

      <div className="relative briefcase-float w-full h-full flex items-center justify-center">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 24 24" 
          fill="none" 
          className={`${isLg ? 'drop-shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'drop-shadow-md'}`}
        >
          <defs>
            <clipPath id={`clip-${maskId}`}>
              <path d={bodyPath} />
            </clipPath>
            
            <linearGradient id={gradientId} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor={isGold ? '#FDE047' : isPositive ? '#34d399' : '#fb7185'} />
              <stop offset="40%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={isGold ? '#854D0E' : isPositive ? '#065f46' : '#9f1239'} />
            </linearGradient>

            <mask id={`liquid-mask-${maskId}`}>
              <rect x="0" y="0" width="24" height="24" fill="black" />
              <rect 
                x="2" y="8" width="20" height="14" 
                fill="white" 
                className="animate-gold-fill"
              />
            </mask>
          </defs>

          {/* Briefcase Handle - Use var(--brand-text) for visibility on light themes */}
          <path 
            d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
            stroke="var(--brand-text)" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
          />
          
          <path 
            d={bodyPath} 
            fill={isGold ? "rgba(250,204,21,0.05)" : "rgba(244,63,94,0.02)"}
            stroke={primaryColor}
            strokeWidth="0.8"
          />

          <text 
            x="12" y="17.5" 
            fontSize="4.5" fontWeight="900" 
            textAnchor="middle" 
            fill={primaryColor} 
            style={{ fontFamily: '"Plus Jakarta Sans"', transition: 'fill 0.4s ease' }}
          >
            JK
          </text>

          <g clipPath={`url(#clip-${maskId})`}>
            <rect 
              x="2" y="8" width="20" height="14" 
              fill={`url(#${gradientId})`} 
              className="animate-gold-fill"
              opacity="0.9"
            />
            <text 
              x="12" y="17.5" 
              fontSize="4.5" fontWeight="900" 
              textAnchor="middle" 
              fill="white" 
              mask={`url(#liquid-mask-${maskId})`}
              style={{ fontFamily: '"Plus Jakarta Sans"', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
              JK
            </text>
          </g>

          <path d={bodyPath} fill="rgba(255,255,255,0.05)" />
        </svg>
      </div>
    </div>
  );
};

export default BrandedLogo;