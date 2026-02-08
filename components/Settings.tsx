import React, { useState, useRef } from 'react';
import { UserSettings, UserProfile, AppTheme, WealthItem, DensityLevel } from '../types';
import { 
  LogOut, Palette, Download, Upload, Zap, Sparkles,
  ShieldAlert, Shield, Trash2, History, Database, Eraser,
  Maximize2, Minimize2, Layout, TrendingUp, Coins
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
  onImport: (file: File) => void;
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
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, onLogout, onReset, onUpdateAppTheme, onUpdateCurrency, 
  onUpdateSplit, onExport, onImport, onRestore, onLoadMockData, onPurgeMockData,
  onUpdateDensity, onUpdateBaseIncome
}) => {
  const [localIncome, setLocalIncome] = useState(settings.monthlyIncome.toString());
  const [localSplit, setLocalSplit] = useState(settings.split);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleSplitChange = (key: keyof typeof localSplit, val: string) => {
    const num = parseInt(val) || 0;
    const newSplit = { ...localSplit, [key]: num };
    setLocalSplit(newSplit);
  };

  const saveSplits = () => {
    if (localSplit.Needs + localSplit.Wants + localSplit.Savings === 100) {
      onUpdateSplit(localSplit);
      triggerHaptic(20);
    } else {
      alert("Allocations must sum exactly to 100%");
    }
  };

  const saveIncome = () => {
    onUpdateBaseIncome?.(parseInt(localIncome) || 0);
    triggerHaptic(20);
  };

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onImport(file); triggerHaptic(30); }
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleJSONChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onRestore(file); triggerHaptic(30); }
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const sectionClass = "bg-brand-surface border border-brand-border rounded-xl mb-2 overflow-hidden shadow-sm";
  const labelClass = "text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-2 px-2";

  return (
    <div className="animate-slide-up relative h-full flex flex-col no-scrollbar overflow-hidden">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-2 shadow-md h-[50px] flex items-center relative overflow-hidden mx-0.5 shrink-0 border border-white/5">
        <div className="absolute top-0 right-0 p-2 opacity-10 text-brand-headerText"><Shield size={40} /></div>
        <div className="flex items-center gap-2.5 relative z-10 w-full px-1">
          <div className="flex-1 min-w-0">
            <h1 className="text-[14px] font-black text-brand-headerText tracking-tight leading-none truncate uppercase">Registry Settings</h1>
            <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-0.5 truncate">Maintenance & Protocol</p>
          </div>
        </div>
      </div>

      <div className="px-0.5 flex-1 overflow-y-auto no-scrollbar space-y-2 pb-24">
        {/* VIEW DENSITY PROTOCOL */}
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

        {/* THEME SELECTION */}
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

        {/* FINANCIAL PROTOCOL */}
        <section className={sectionClass}>
          <div className="p-4 space-y-4">
            <h3 className={labelClass}><TrendingUp size={12} /> Wealth Parameters</h3>
            <div className="space-y-2">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Baseline Income</p>
               <div className="flex gap-2">
                 <div className="relative flex-1">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">{getCurrencySymbol(settings.currency)}</span>
                   <input type="number" value={localIncome} onChange={(e) => setLocalIncome(e.target.value)} className="w-full bg-brand-accent pl-8 pr-3 py-3 rounded-xl text-xs font-black outline-none border border-brand-border text-brand-text shadow-inner" />
                 </div>
                 <button onClick={saveIncome} className="bg-brand-accentUi text-brand-headerText font-black px-4 rounded-xl text-[9px] uppercase shadow-sm active:scale-95 transition-all">Apply</button>
               </div>
            </div>
            <div className="space-y-3 pt-2">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Capital Allocation</p>
               <div className="grid grid-cols-3 gap-2">
                  {Object.keys(localSplit).map((key) => (
                    <div key={key} className="space-y-1">
                       <span className="text-[7px] font-black text-slate-500 uppercase text-center block">{key}</span>
                       <div className="relative">
                          <input type="number" value={localSplit[key as keyof typeof localSplit]} onChange={(e) => handleSplitChange(key as any, e.target.value)} className="w-full bg-brand-accent p-2 pr-5 rounded-xl text-center text-[12px] font-black border border-brand-border text-brand-text shadow-inner" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-600 font-bold">%</span>
                       </div>
                    </div>
                  ))}
               </div>
               <button onClick={saveSplits} className="w-full mt-2 bg-brand-accent text-brand-text py-3 rounded-xl text-[9px] font-black uppercase border border-brand-border active:scale-[0.98] shadow-sm">Lock Protocols</button>
            </div>
          </div>
        </section>

        {/* DATA MANAGEMENT */}
        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Database size={12} /> Data Vault</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => { triggerHaptic(); onLoadMockData(); }} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-brand-accent border border-brand-border active:scale-95 transition-all group shadow-sm">
                  <Sparkles size={18} className="text-brand-accentUi group-hover:animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-brand-text">Load Demo</span>
                </button>
                <button onClick={() => csvInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-brand-accent border border-brand-border active:scale-95 transition-all shadow-sm">
                  <Upload size={18} className="text-slate-400" />
                  <span className="text-[9px] font-black uppercase text-brand-text">Import CSV</span>
                </button>
                <input type="file" ref={csvInputRef} onChange={handleCSVChange} className="hidden" accept=".csv,.txt,text/csv,text/plain" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={onExport} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-brand-accentUi text-brand-headerText shadow-lg active:scale-[0.98] transition-all">
                  <Download size={18} />
                  <span className="text-[9px] font-black uppercase">Export Vault</span>
                </button>
                <button onClick={() => jsonInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-brand-accent text-slate-400 active:scale-[0.98] transition-all border border-brand-border shadow-sm">
                  <History size={18} />
                  <span className="text-[9px] font-black uppercase">Restore Vault</span>
                </button>
                <input type="file" ref={jsonInputRef} onChange={handleJSONChange} className="hidden" accept=".json,application/json" />
            </div>
          </div>
        </section>

        {/* DANGER ZONE */}
        <section className={`${sectionClass} border-rose-500/20 bg-rose-500/5`}>
          <div className="p-4 space-y-3">
            <h3 className={`${labelClass} text-rose-500`}><Eraser size={12} /> Maintenance</h3>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={onPurgeMockData} className="flex items-center justify-center gap-2 p-4 rounded-xl bg-brand-accent text-slate-400 border border-brand-border active:scale-95 transition-all shadow-sm">
                  <Trash2 size={16} />
                  <span className="text-[9px] font-black uppercase">Scrub Demo</span>
               </button>
               <button onClick={onLogout} className="flex items-center justify-center gap-2 p-4 rounded-xl bg-brand-accent text-slate-400 border border-brand-border active:scale-95 transition-all shadow-sm">
                  <LogOut size={16} />
                  <span className="text-[9px] font-black uppercase">Sign Out</span>
               </button>
            </div>
            <button onClick={onReset} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-rose-600 text-white shadow-lg active:scale-[0.98] transition-all">
                <ShieldAlert size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Factory Reset</span>
            </button>
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