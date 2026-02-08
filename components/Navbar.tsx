import React from 'react';
import { View } from '../types';
import { Plus, MessageCircleQuestion } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface NavbarProps {
  currentView: View;
  remainingPercentage: number;
  netWorth: number;
  categoryPercentages: {
    Needs: number;
    Wants: number;
    Savings: number;
    totalSpent?: number;
    totalPlanned?: number;
  };
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, remainingPercentage, netWorth, categoryPercentages, onViewChange }) => {
  const spentPercentage = Math.max(0, Math.min(100, 100 - remainingPercentage));
  const savingsRate = Math.max(0, Math.min(100, remainingPercentage));
  const isNegativePortfolio = netWorth < 0;

  const handleClick = () => {
    triggerHaptic(20);
    if (currentView === 'Dashboard') {
        onViewChange('Affordability');
    } else {
        onViewChange('Add');
    }
  };

  const renderIcon = () => {
    // Shared Plus Badge - Styled to feel like an attachment
    const PlusBadge = ({ colorClass = "bg-brand-primary" }) => (
      <div className={`absolute -top-1 -right-1 ${colorClass} text-white w-6 h-6 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-2 border-white dark:border-slate-800 transition-all z-20 active:scale-90`}>
        <Plus size={14} strokeWidth={4} />
      </div>
    );

    // Branded Briefcase - Shape mirrors App Header, all text removed for a minimalist aesthetic
    const JKBriefcase = ({ fillId, children }: { fillId: string, children?: React.ReactNode }) => (
      <div className="relative animate-kick group">
        <svg 
          width="68" 
          height="68" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="transition-transform duration-300 drop-shadow-2xl"
        >
          {/* Main Body Path with Percentage Fill */}
          <path 
            d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
            fill={`url(#${fillId})`}
            stroke="var(--brand-border)"
            strokeWidth="0.5"
          />
          {/* Handle - Fixed visibility in light themes by using var(--brand-text) */}
          <path 
            d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
            stroke="var(--brand-text)" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
          />
        </svg>
        {children && (
          <div className="absolute inset-0 flex items-center justify-center mt-3 pointer-events-none">
            {children}
          </div>
        )}
      </div>
    );

    if (currentView === 'Budget') {
      const rNeeds = 10;
      const rWants = 7.2;
      const rSavings = 4.4;
      const cNeeds = 2 * Math.PI * rNeeds;
      const cWants = 2 * Math.PI * rWants;
      const cSavings = 2 * Math.PI * rSavings;
      const trackOpacity = 0.25;

      return (
        <div className="relative w-16 h-16 flex items-center justify-center animate-kick group">
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="drop-shadow-2xl overflow-visible rotate-[-90deg]"
          >
            <circle cx="12" cy="12" r="11.5" fill="var(--brand-surface)" className="transition-colors duration-500" />
            <circle cx="12" cy="12" r={rNeeds} stroke="#60a5fa" strokeWidth="2.4" strokeOpacity={trackOpacity} />
            <circle 
              cx="12" cy="12" r={rNeeds} 
              stroke="#60a5fa" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              style={{ 
                strokeDasharray: `${cNeeds} ${cNeeds}`, 
                strokeDashoffset: cNeeds - (cNeeds * (Math.min(100, categoryPercentages.Needs) / 100)) 
              }} 
              className="transition-all duration-1000 ease-out"
            />
            <circle cx="12" cy="12" r={rWants} stroke="#f97316" strokeWidth="2.4" strokeOpacity={trackOpacity} />
            <circle 
              cx="12" cy="12" r={rWants} 
              stroke="#f97316" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              style={{ 
                strokeDasharray: `${cWants} ${cWants}`, 
                strokeDashoffset: cWants - (cWants * (Math.min(100, categoryPercentages.Wants) / 100)) 
              }} 
              className="transition-all duration-1000 ease-out"
            />
            <circle cx="12" cy="12" r={rSavings} stroke="#22c55e" strokeWidth="2.4" strokeOpacity={trackOpacity} />
            <circle 
              cx="12" cy="12" r={rSavings} 
              stroke="#22c55e" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              style={{ 
                strokeDasharray: `${cSavings} ${cSavings}`, 
                strokeDashoffset: cSavings - (cSavings * (Math.min(100, categoryPercentages.Savings) / 100)) 
              }} 
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <PlusBadge colorClass="bg-brand-primary" />
        </div>
      );
    }

    if (currentView === 'Accounts') {
      const statusColor = isNegativePortfolio ? "#ef4444" : "#22c55e";
      return (
        <div className="relative">
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="accountBrandedFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset={`${savingsRate}%`} stopColor={statusColor} />
                <stop offset={`${savingsRate}%`} stopColor="#cbd5e1" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
          <JKBriefcase fillId="accountBrandedFill" />
          <PlusBadge colorClass={isNegativePortfolio ? "bg-rose-600" : "bg-emerald-600"} />
        </div>
      );
    }

    if (currentView === 'Dashboard') {
        return (
          <div className="relative scale-110">
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="dashboardBrandedFill" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="100%" stopColor="var(--brand-accent-ui)" />
                </linearGradient>
              </defs>
            </svg>
            <JKBriefcase fillId="dashboardBrandedFill">
              <MessageCircleQuestion className="text-white" size={24} strokeWidth={3} />
            </JKBriefcase>
            <PlusBadge colorClass="bg-white !text-brand-primary border-brand-primary" />
          </div>
        );
    }

    return (
      <div className="relative">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="wealthBrandedFill" x1="0" y1="1" x2="0" y2="0">
              <stop offset={`${spentPercentage}%`} stopColor="#ef4444" />
              <stop offset={`${spentPercentage}%`} stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        <JKBriefcase fillId="wealthBrandedFill" />
        <PlusBadge />
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-8 px-4 flex justify-end">
      <button
        onClick={handleClick}
        className="pointer-events-auto flex items-center justify-center transition-all active:scale-75 hover:scale-110 group relative"
      >
        <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full scale-150 group-hover:bg-brand-primary/30 transition-all"></div>
        {renderIcon()}
      </button>
    </div>
  );
};

export default Navbar;