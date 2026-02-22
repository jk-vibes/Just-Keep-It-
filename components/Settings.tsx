import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, UserProfile, AppTheme, WealthItem, DensityLevel, Category } from '../types';
import { 
  LogOut, Palette, Download, Upload, Zap, Sparkles,
  ShieldAlert, Shield, Trash2, History, Database, Eraser,
  Maximize2, Minimize2, Layout, TrendingUp,
  ChevronRight, Tag, Percent, Loader2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { getCurrencySymbol } from '../constants';
import { NarutoIcon, SpiderIcon, CaptainAmericaIcon, BatmanIcon, MoonIcon } from './ThemeSymbols';

interface SettingsProps {
  settings: UserSettings;
  user: UserProfile | null;
  onLogout: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
  onUpdateAppTheme: (theme: AppTheme) => void;
  onUpdateCurrency: (code: string) => void;
  onUpdateSplit: (split: { Needs: number; Wants: number; Savings: number }) => void;
  onSync: () => void;
  onExport: () => void;
  onRestore: (file: File) => void;
  onAddBulk: (items: any[]) => void;
  isSyncing: boolean;
  onLoadMockData: () => void;
  onPurgeMockData: () => void;
  onPurgeAllData?: () => void;
  wealthItems?: WealthItem[];
  onUpdateDataFilter?: (filter: 'all' | 'user' | 'mock') => void;
  onUpdateBaseIncome?: (income: number) => void;
  onUpdateDensity?: (density: DensityLevel) => void;
  onClearExpenses?: () => void;
  onOpenCategoryManager: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, onLogout, onReset, onUpdateAppTheme, 
  onExport, onRestore, onLoadMockData, onPurgeMockData,
  onUpdateDensity, onUpdateBaseIncome, onUpdateSplit, onOpenCategoryManager
}) => {
  const [localIncome, setLocalIncome] = useState(settings.monthlyIncome.toString());
  const [localNeeds, setLocalNeeds] = useState(settings.split.Needs.toString());
  const [localWants, setLocalWants] = useState(settings.split.Wants.toString());
  const [localSavings, setLocalSavings] = useState(settings.split.Savings.toString());

  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Real-time update handlers
  const handleIncomeChange = (val: string) => {
    setLocalIncome(val);
    const num = parseInt(val) || 0;
    onUpdateBaseIncome?.(num);
  };

  const handleSplitChange = (key: 'Needs' | 'Wants' | 'Savings', val: string) => {
    const setters = { Needs: setLocalNeeds, Wants: setLocalWants, Savings: setLocalSavings };
    setters[key](val);

    const newSplit = {
      Needs: key === 'Needs' ? (parseInt(val) || 0) : (parseInt(localNeeds) || 0),
      Wants: key === 'Wants' ? (parseInt(val) || 0) : (parseInt(localWants) || 0),
      Savings: key === 'Savings' ? (parseInt(val) || 0) : (parseInt(localSavings) || 0),
    };
    onUpdateSplit(newSplit);
  };

  const handleJSONChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onRestore(file); triggerHaptic(30); }
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const sectionClass = "bg-brand-surface border border-brand-border rounded-xl mb-2 overflow-hidden shadow-sm";
  const labelClass = "text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-2 px-2";
  
  const vaultButtonClass = "flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-brand-accent border border-brand-border active:border-brand-primary active:scale-95 transition-all group shadow-sm disabled:opacity-50";

  return (
    <div className="animate-slide-up relative h-full flex flex-col no-scrollbar overflow-hidden">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-2 shadow-md h-[50px] flex items-center relative overflow-hidden mx-0.5 shrink-0 border border-white/5">
        <div className="absolute top-0 right-0 p-2 opacity-10 text-brand-headerText"><Shield size={40} /></div>
        <div className="flex items-center justify-between relative z-10 w-full px-1">
          <div className="flex-1 min-w-0">
            <h1 className="text-[14px] font-black text-brand-headerText tracking-tight leading-none truncate uppercase">Settings</h1>
            <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-0.5 truncate">Maintenance & Protocol</p>
          </div>
          <button 
            onClick={() => { triggerHaptic(); onLogout(); }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-brand-headerText transition-colors active:scale-95"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="px-0.5 flex-1 overflow-y-auto no-scrollbar space-y-2 pb-24">
        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Layout size={12} /> Visual Protocol</h3>
            <div className="bg-brand-accent p-1 rounded-2xl flex border border-brand-border shadow-inner">
              <button 
                onClick={() => { triggerHaptic(); onUpdateDensity?.('Normal'); }}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${settings.density === 'Normal' ? 'bg-brand-surface text-brand-text shadow-lg' : 'text-slate-500 opacity-60'}`}
              >
                <Maximize2 size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Normal</span>
              </button>
              <button 
                onClick={() => { triggerHaptic(); onUpdateDensity?.('Compact'); }}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${settings.density === 'Compact' ? 'bg-brand-surface text-brand-text shadow-lg' : 'text-slate-500 opacity-60'}`}
              >
                <Minimize2 size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Compact</span>
              </button>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Palette size={12} /> Theme Identity</h3>
            <div className="grid grid-cols-5 gap-2">
              {themes.map(t => (
                <button key={t.id} onClick={() => { triggerHaptic(); onUpdateAppTheme(t.id); }} className={`aspect-square transition-all active:scale-90 flex items-center justify-center relative rounded-xl border-2 ${settings.appTheme === t.id ? 'border-brand-accentUi bg-brand-accentUi/10 shadow-lg' : 'opacity-30 border-transparent'}`}>
                  <div className="w-10 h-10 flex items-center justify-center">{t.icon}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4 space-y-5">
            <h3 className={labelClass}><TrendingUp size={12} /> Budget Settings</h3>
            <div className="space-y-2">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Baseline Income</p>
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">{getCurrencySymbol(settings.currency)}</span>
                 <input 
                   type="number" 
                   value={localIncome} 
                   onChange={(e) => handleIncomeChange(e.target.value)} 
                   className="w-full bg-brand-accent pl-8 pr-3 py-3 rounded-xl text-xs font-black outline-none border border-brand-border text-brand-text shadow-inner" 
                 />
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex items-center justify-between ml-1">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Split (50/30/20)</p>
                 <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-brand-primary uppercase">
                       {parseInt(localNeeds) + parseInt(localWants) + parseInt(localSavings)}%
                    </span>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Needs</span>
                    <div className="relative">
                       <input 
                         type="number" 
                         value={localNeeds} 
                         onChange={(e) => handleSplitChange('Needs', e.target.value)} 
                         className="w-full bg-brand-accent px-3 py-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text shadow-inner" 
                       />
                       <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Wants</span>
                    <div className="relative">
                       <input 
                         type="number" 
                         value={localWants} 
                         onChange={(e) => handleSplitChange('Wants', e.target.value)} 
                         className="w-full bg-brand-accent px-3 py-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text shadow-inner" 
                       />
                       <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Saves</span>
                    <div className="relative">
                       <input 
                         type="number" 
                         value={localSavings} 
                         onChange={(e) => handleSplitChange('Savings', e.target.value)} 
                         className="w-full bg-brand-accent px-3 py-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text shadow-inner" 
                       />
                       <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">%</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Database size={12} /> Data Vault</h3>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { triggerHaptic(); onLoadMockData(); }} className={vaultButtonClass}>
                  <Sparkles size={16} className="text-brand-accentUi group-hover:animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-brand-text">Demo</span>
                </button>
                <button onClick={() => { triggerHaptic(); onExport(); }} className={vaultButtonClass}>
                  <Download size={16} className="text-brand-primary" />
                  <span className="text-[8px] font-black uppercase text-brand-text">Backup</span>
                </button>
                <button onClick={() => { triggerHaptic(); jsonInputRef.current?.click(); }} className={vaultButtonClass}>
                  <History size={16} className="text-brand-primary" />
                  <span className="text-[8px] font-black uppercase text-brand-text">Restore</span>
                </button>
                <input type="file" ref={jsonInputRef} onChange={handleJSONChange} className="hidden" accept=".json,application/json" />
                
                <button onClick={() => { triggerHaptic(); onOpenCategoryManager(); }} className={vaultButtonClass}>
                  <Tag size={16} className="text-brand-primary" />
                  <span className="text-[8px] font-black uppercase text-brand-text">Tags</span>
                </button>
                <button onClick={() => { triggerHaptic(); onPurgeMockData(); }} className={vaultButtonClass}>
                  <Trash2 size={16} className="text-rose-500" />
                  <span className="text-[8px] font-black uppercase text-brand-text">Scrub</span>
                </button>
                <button onClick={() => { triggerHaptic(); onReset(); }} className={`${vaultButtonClass} border-rose-500/30 text-rose-500`}>
                  <ShieldAlert size={16} />
                  <span className="text-[8px] font-black uppercase">Reset</span>
                </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const themes: { id: AppTheme, icon: React.ReactNode }[] = [
  { id: 'Batman', icon: <BatmanIcon /> },
  { id: 'Moon', icon: <MoonIcon /> },
  { id: 'Spiderman', icon: <SpiderIcon /> },
  { id: 'CaptainAmerica', icon: <CaptainAmericaIcon /> },
  { id: 'Naruto', icon: <NarutoIcon /> }
];

export default Settings;