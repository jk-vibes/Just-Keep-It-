import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, ArrowDownCircle, ArrowUpCircle, Edit3, Trash2, Save, Wallet, ShieldCheck, RefreshCw, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { WealthItem, UserSettings, Category } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS } from '../constants';
import { triggerHaptic } from '../utils/haptics';
import { auditTransaction } from '../services/geminiService';

interface ImportReviewModalProps {
  stagedItems: any[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  onConfirm: (finalItems: any[]) => void;
  onCancel: () => void;
}

const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ stagedItems, wealthItems, settings, onConfirm, onCancel }) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  const liquidAccounts = useMemo(() => 
    wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card'].includes(i.category)), 
    [wealthItems]
  );

  const [items, setItems] = useState(() => {
    return stagedItems.map((item, idx) => {
      let targetAccountId = item.entryType === 'Account' ? 'SYSTEM' : (item.targetAccountId || '');
      
      if (item.entryType !== 'Account' && !targetAccountId) {
        const hint = (item.accountName || item.merchant || '').toLowerCase();
        const match = wealthItems.find(w => 
          w.name.toLowerCase().includes(hint) || 
          hint.includes(w.name.toLowerCase()) ||
          w.alias?.toLowerCase().includes(hint) ||
          hint.includes(w.alias?.toLowerCase() || '')
        );
        if (match) {
          targetAccountId = match.id;
        } else if (liquidAccounts.length === 1) {
          targetAccountId = liquidAccounts[0].id;
        }
      }

      return { 
        ...item, 
        tempId: idx, 
        action: 'create' as 'create' | 'skip', 
        targetAccountId,
        isAvoidConfirmed: false,
        isAuditing: false
      };
    });
  });

  const handleUpdateItem = (tempId: number, updates: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
  };

  const handleRemove = (tempId: number) => {
    triggerHaptic();
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, action: 'skip' } : item));
  };

  const runNeuralAudit = async (tempId: number) => {
    const item = items.find(i => i.tempId === tempId);
    if (!item || item.isAuditing || item.entryType !== 'Expense') return;
    
    handleUpdateItem(tempId, { isAuditing: true });
    try {
      const result = await auditTransaction({ ...item, amount: item.amount || 0 } as any, settings.currency);
      if (result) {
        handleUpdateItem(tempId, { 
          category: result.suggestedCategory, 
          subCategory: result.suggestedSubCategory,
          potentialAvoid: result.potentialAvoid,
          isAuditing: false
        });
        if (result.potentialAvoid) triggerHaptic(50);
      }
    } catch (e) {
      handleUpdateItem(tempId, { isAuditing: false });
    }
  };

  const toggleAvoid = (tempId: number) => {
    triggerHaptic();
    const item = items.find(i => i.tempId === tempId);
    if (item) {
      const newCategory = item.category === 'Avoids' ? 'Wants' : 'Avoids';
      handleUpdateItem(tempId, { category: newCategory, isAvoidConfirmed: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden border border-white/10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Review & Audit Ledger</h3>
            <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Scrubbing {items.filter(i => i.action !== 'skip').length} signals</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {items.map((item) => {
            if (item.action === 'skip') return null;

            const isAccount = item.entryType === 'Account';
            const isAvoid = item.category === 'Avoids';
            const valToDisplay = item.amount !== undefined ? item.amount : item.value;

            return (
              <div key={item.tempId} className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm group animate-kick transition-all ${isAvoid ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/5' : isAccount ? 'border-blue-100 dark:border-blue-900/30' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-opacity-10 shrink-0 ${
                      item.entryType === 'Expense' ? (isAvoid ? 'bg-amber-500 text-amber-500' : 'bg-rose-500 text-rose-500') : 
                      item.entryType === 'Income' ? 'bg-emerald-500 text-emerald-500' :
                      item.entryType === 'Account' ? 'bg-blue-500 text-blue-500' : 'bg-indigo-500 text-indigo-500'
                    }`}>
                      {item.entryType === 'Expense' ? (isAvoid ? <AlertTriangle size={16} /> : <ArrowDownCircle size={16} />) : 
                       item.entryType === 'Income' ? <ArrowUpCircle size={16} /> :
                       item.entryType === 'Account' ? <ShieldCheck size={16} /> : <RefreshCw size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={item.merchant || item.source || item.name || 'General'} 
                          onChange={(e) => handleUpdateItem(item.tempId, { merchant: e.target.value, name: e.target.value, alias: e.target.value })}
                          className={`text-[11px] font-black bg-transparent border-none outline-none focus:ring-0 w-32 p-0 leading-none ${isAccount ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}
                        />
                        {item.entryType === 'Expense' && (
                          <button 
                            onClick={() => runNeuralAudit(item.tempId)}
                            className="p-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded hover:scale-110 transition-transform"
                          >
                            {item.isAuditing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          </button>
                        )}
                      </div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {item.date} • {isAccount ? `Registry Point (${item.wealthCategory})` : item.entryType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] font-black text-slate-300">{currencySymbol}</span>
                      <input 
                        type="number" 
                        value={valToDisplay === 0 ? '' : valToDisplay} 
                        onChange={(e) => {
                          const val = Math.round(parseFloat(e.target.value) || 0);
                          if (isAccount) handleUpdateItem(item.tempId, { value: val });
                          else handleUpdateItem(item.tempId, { amount: val });
                        }}
                        className={`text-[14px] font-black bg-transparent border-none outline-none focus:ring-0 text-right w-20 p-0 leading-none ${isAccount ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {!isAccount && (
                  <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={8} /> Bind Account</span>
                          {item.potentialAvoid && !isAvoid && (
                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/40 animate-pulse">
                              <AlertTriangle size={8} />
                              <span className="text-[6px] font-black uppercase">Unwanted?</span>
                            </div>
                          )}
                       </div>
                       <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5">
                          {(['Needs', 'Wants', 'Avoids'] as Category[]).map(cat => (
                            <button
                              key={cat}
                              onClick={() => handleUpdateItem(item.tempId, { category: cat })}
                              className={`px-2 py-1 rounded text-[6px] font-black uppercase transition-all ${item.category === cat ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                              {cat}
                            </button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="relative">
                      <select 
                        value={item.targetAccountId}
                        onChange={(e) => handleUpdateItem(item.tempId, { targetAccountId: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold outline-none border border-transparent focus:border-indigo-500/30 dark:text-white appearance-none pr-8"
                      >
                        <option value="">Select binding account...</option>
                        {liquidAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {isAvoid && !item.isAvoidConfirmed && (
                      <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800 animate-slide-up">
                        <p className="text-[8px] font-bold text-amber-700 dark:text-amber-200 mb-2">Tag as unwanted expense? Avoids will be tracked as a separate efficiency metric.</p>
                        <button 
                          onClick={() => handleUpdateItem(item.tempId, { isAvoidConfirmed: true })}
                          className="w-full py-1.5 bg-amber-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95"
                        >
                          Confirm Avoid
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex justify-between items-center">
                   <p className="text-[6px] font-bold text-slate-400 italic truncate max-w-[70%]">
                      {item.rawContent || 'Manual Ingestion Point'}
                   </p>
                   <button onClick={() => handleRemove(item.tempId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 active:scale-90"><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-3">
          <button 
            onClick={() => {
              triggerHaptic(20);
              const readyItems = items.filter(i => i.action !== 'skip');
              const pendingAvoids = readyItems.filter(i => i.category === 'Avoids' && !i.isAvoidConfirmed);
              
              if (pendingAvoids.length > 0) {
                alert("Please confirm the 'Avoid' status for highlighted expenses.");
                return;
              }

              if (readyItems.some(i => i.entryType !== 'Account' && !i.targetAccountId)) {
                alert("Validation failed. Please bind all transactions to a registry account.");
                return;
              }
              onConfirm(readyItems);
            }}
            className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all"
          >
            <Save size={18} /> Authorize Ledger Ingestion
          </button>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default ImportReviewModal;