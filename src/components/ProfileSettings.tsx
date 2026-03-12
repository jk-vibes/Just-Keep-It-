import React, { useState } from 'react';
import { UserSettings, UserProfile } from '../types';
import { SUPPORTED_CURRENCIES } from '../constants';
import { 
  User, LogOut, Shield, Bell, HelpCircle, 
  ChevronRight, Calculator, Moon, Sun, 
  Cloud, RefreshCw, Smartphone, Coins, Trash2, Check, Database, Eraser, Filter
} from 'lucide-react';

interface ProfileSettingsProps {
  settings: UserSettings;
  user: UserProfile | null;
  onLogout: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
  onUpdateCurrency: (code: string) => void;
  onUpdateDataFilter: (filter: 'all' | 'user' | 'mock') => void;
  onSync: () => void;
  isSyncing: boolean;
  onLoadMockData: () => void;
  onClearExpenses: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  settings, 
  user, 
  onLogout, 
  onReset, 
  onToggleTheme, 
  onUpdateCurrency, 
  onUpdateDataFilter,
  onSync, 
  isSyncing,
  onLoadMockData,
  onClearExpenses
}) => {
  const isDark = settings.theme === 'dark';
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency) || SUPPORTED_CURRENCIES[0];

  return (
    <div className="pb-32 pt-6 space-y-6 dark:text-slate-100">
      
      {/* Quick Settings Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onToggleTheme}
          className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm border border-slate-50 dark:border-slate-800"
        >
          <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-amber-50 text-amber-500'}`}>
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm border border-slate-50 dark:border-slate-800 disabled:opacity-50"
        >
          <div className={`p-2.5 rounded-2xl ${isSyncing ? 'animate-spin' : ''} bg-indigo-50 dark:bg-indigo-900/50 text-indigo-500`}>
            {isSyncing ? <RefreshCw size={20} /> : <Cloud size={20} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">{isSyncing ? 'Syncing...' : 'Cloud Backup'}</span>
        </button>
      </div>

      {/* Target Allocation Card */}
      <div className="bg-[#163074] rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <Calculator size={18} className="text-indigo-200" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider">Target Allocation</h3>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(settings.split).map(([cat, val]) => (
            <div key={cat} className="flex-1 text-center bg-white/10 rounded-2xl py-3 border border-white/10">
              <p className="text-[9px] font-black uppercase text-indigo-200 mb-1">{cat}</p>
              <div className="text-xl font-black">
                {val}<span className="text-xs opacity-70 ml-0.5">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source Switcher */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Data Source</h3>
        <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl flex border border-slate-100 dark:border-slate-800">
          {(['all', 'user', 'mock'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onUpdateDataFilter(filter)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                settings.dataFilter === filter 
                  ? 'bg-white dark:bg-slate-700 text-[#163074] dark:text-white shadow-sm' 
                  : 'text-slate-400 dark:text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-slate-400 font-bold px-2 italic uppercase">
          Currently showing: <span className="text-indigo-500">{settings.dataFilter === 'all' ? 'Combined History' : settings.dataFilter === 'mock' ? 'Demo Samples Only' : 'Your Actual Entries'}</span>
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">App Preferences</h3>
        
        <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-50 dark:border-slate-800">
          <button 
            onClick={() => setShowCurrencyModal(true)}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-2xl text-[#f14444]">
                <Coins size={18} />
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-white text-xs">Currency</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{currentCurrency.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[11px] font-black text-[#163074] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">{settings.currency}</span>
               <ChevronRight className="text-slate-300" size={16} />
            </div>
          </button>

          <button 
            onClick={onLoadMockData}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-2xl text-indigo-500">
                <Database size={18} />
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-white text-xs">Load Demo Data</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Populate 3 months history</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300" size={16} />
          </button>

          <button 
            onClick={onClearExpenses}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-2xl text-amber-500">
                <Eraser size={18} />
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-white text-xs">Purge History</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Clear all transactions</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300" size={16} />
          </button>
        </div>

        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 pt-2">Account & Support</h3>
        <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-sm border border-slate-50 dark:border-slate-800">
          {[
            { icon: Shield, label: 'Security & Privacy', color: 'text-slate-400' },
            { icon: Bell, label: 'Notifications', color: 'text-slate-400' },
            { icon: HelpCircle, label: 'Help Center', color: 'text-slate-400' },
          ].map((item, idx, arr) => (
            <button 
              key={item.label}
              className={`w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors ${idx !== arr.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={item.color} />
                <p className="font-black text-slate-900 dark:text-white text-xs">{item.label}</p>
              </div>
              <ChevronRight className="text-slate-300" size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-4 text-[#163074] dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/20 rounded-[28px] text-xs uppercase tracking-widest transition-all active:scale-95"
        >
          <LogOut size={16} />
          Sign Out
        </button>
        
        <button 
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 p-4 text-rose-500 font-black bg-rose-50 dark:bg-rose-900/20 rounded-[28px] border border-rose-100 dark:border-rose-900/30 text-xs uppercase tracking-widest transition-all active:scale-95"
        >
          <Trash2 size={16} />
          Wipe App Data
        </button>
      </div>

      <div className="text-center pt-2 pb-8">
        <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">
          Just Keep It • v1.0
        </span>
      </div>

      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center p-0 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[40px] animate-slide-up shadow-2xl border-t border-white/10">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-[#163074] dark:text-white uppercase tracking-tight">Currency</h3>
              <button onClick={() => setShowCurrencyModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <ChevronRight size={20} className="rotate-90" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
              {SUPPORTED_CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => {
                    onUpdateCurrency(curr.code);
                    setShowCurrencyModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-[28px] transition-all ${
                    settings.currency === curr.code 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                      settings.currency === curr.code ? 'bg-[#f14444] text-white shadow-lg shadow-red-200 dark:shadow-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {curr.symbol}
                    </div>
                    <div className="text-left">
                      <p className={`font-black text-sm ${settings.currency === curr.code ? 'text-[#163074] dark:text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                        {curr.code}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{curr.name}</p>
                    </div>
                  </div>
                  {settings.currency === curr.code && <div className="w-6 h-6 bg-[#f14444] rounded-full flex items-center justify-center text-white"><Check size={14} strokeWidth={4} /></div>}
                </button>
              ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selected currency updates all views</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;