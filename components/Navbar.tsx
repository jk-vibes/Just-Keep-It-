import React from 'react';
import { View } from '../types';
import { Plus, MessageCircleQuestion } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface NavbarProps {
  currentView: View;
  remainingPercentage: number;
  netWorth: number;
  totalAssets?: number;
  totalLiabilities?: number;
  categoryPercentages: {
    Needs: number;
    Wants: number;
    Savings: number;
    totalSpent?: number;
    totalPlanned?: number;
  };
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  remainingPercentage, 
  netWorth, 
  totalAssets = 0,
  totalLiabilities = 0,
  categoryPercentages, 
  onViewChange 
}) => {
  const spentPercentage = Math.max(0, Math.min(100, 100 - remainingPercentage));
  
  const handleMainClick = () => {
    triggerHaptic(20);
    if (currentView === 'Dashboard') {
        onViewChange('Affordability');
    } else {
        onViewChange('Dashboard');
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(25);
    onViewChange('Add');
  };

  const renderIcon = () => {
    const ActionBadge = () => (
      <button 
        onClick={handleAddClick}
        className="absolute -top-1 -right-1 bg-brand-accentUi text-brand-headerText w-8 h-8 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(251,191,36,0.3)] border-2 border-white dark:border-slate-800 transition-all z-30 active:scale-75 pointer-events-auto"
      >
        <Plus size={20} strokeWidth={4} />
      </button>
    );

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
          <path 
            d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
            fill={`url(#${fillId})`}
            stroke="var(--brand-border)"
            strokeWidth="0.5"
          />
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
          <ActionBadge />
        </div>
      );
    }

    if (currentView === 'Accounts') {
      const isPositive = totalAssets > totalLiabilities;
      const statusColor = isPositive ? "#22c55e" : "#ef4444";
      
      // Calculate fill based on asset/liability ratio
      let accountFill = 0;
      if (isPositive) {
        // Assets are more: Fill represents the "equity" part of assets
        accountFill = totalAssets > 0 ? ((totalAssets - totalLiabilities) / totalAssets) * 100 : 0;
      } else {
        // Liabilities are more: Fill represents how much of the debt is covered by assets
        accountFill = totalLiabilities > 0 ? (totalAssets / totalLiabilities) * 100 : 0;
      }
      
      accountFill = Math.min(100, Math.max(5, accountFill)); // Ensure at least a sliver is visible

      return (
        <div className="relative">
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="accountBrandedFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset={`${accountFill}%`} stopColor={statusColor} />
                <stop offset={`${accountFill}%`} stopColor="#cbd5e1" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
          <JKBriefcase fillId="accountBrandedFill" />
          <ActionBadge />
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
        <ActionBadge />
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-8 px-4 flex justify-end">
      <div
        className="pointer-events-auto flex items-center justify-center transition-all active:scale-95 hover:scale-110 group relative"
      >
        <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full scale-150 group-hover:bg-brand-primary/30 transition-all"></div>
        <div onClick={handleMainClick} className="cursor-pointer">
          {renderIcon()}
        </div>
      </div>
    </div>
  );
};

export default Navbar;