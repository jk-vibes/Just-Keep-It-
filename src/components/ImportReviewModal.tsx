
import React, { useState, useMemo } from 'react';
import { X, Check, ArrowDownCircle, ArrowUpCircle, Edit3, Trash2, Save, Wallet, ShieldCheck, RefreshCw, AlertTriangle, Sparkles, Loader2, Calendar, Database } from 'lucide-react';
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
  /* Added showToast to props to fix missing name error */
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'advice') => void;
}

const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ stagedItems, wealthItems, settings, onConfirm, onCancel, showToast }) => {
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

      // Default skip duplicates or stale items
      const initialAction = (item.isDuplicate || item.isStale) ? 'skip' : 'create';

      return { 
        ...item, 
        tempId: idx, 
        action: initialAction as 'create' | 'skip', 
        targetAccountId,
        isAvoidConfirmed: false,
        isAuditing: false
      };
    });
  });

  const handleUpdateItem = (tempId: number, updates: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
  };

  const toggleAction = (tempId: number) => {
    triggerHaptic();
    setItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return { ...item, action: item.action === 'create' ? 'skip' : 'create' };
      }
      return item;
    }));
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

  const counts = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.action === 'create').length,
    skipped: items.filter(i => i.action === 'skip').length,
    duplicates: items.filter(i => i.isDuplicate).length,
    stale: items.filter(i => i.isStale && !i.isDuplicate).length
  }), [items]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-brand-bg w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden border border-brand-border">
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-border bg-brand-surface">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-text">Ingestion Protocol</h3>
            <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">
              {counts.active} Signals Active • {counts.duplicates} Duplicates • {counts.stale} Stale
            </p>
          </div>
          <button onClick={onCancel} className="p-2 bg-brand-accent rounded-full text-slate-400 active:scale-90 transition-transform"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {items.map((item) => {
            const isAccount = item.entryType === 'Account';
            const valToDisplay = item.amount !== undefined ? item.amount : item.value;
            const isSkipped = item.action === 'skip';

            return (
              <div 
                key={item.tempId} 
                className={`bg-brand-surface border rounded-2xl p-4 shadow-sm transition-all animate-kick flex flex-col gap-3 ${
                  isSkipped ? 'opacity-40 grayscale border-brand-border' : 
                  item.isDuplicate ? 'border-rose-500/30 ring-1 ring-rose-500/10' :
                  item.isStale ? 'border-amber-500/30 ring-1 ring-amber-500/10' :
                  'border-brand-border'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleAction(item.tempId)}
                      className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isSkipped ? 'bg-slate-800 text-slate-500' :
                        item.entryType === 'Expense' ? 'bg-rose-500/10 text-rose-500' : 
                        item.entryType === 'Income' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-indigo-500/10 text-indigo-500'
                      }`}
                    >
                      {isSkipped ? <X size={16} /> : 
                       item.entryType === 'Expense' ? <ArrowDownCircle size={16} /> : 
                       item.entryType === 'Income' ? <ArrowUpCircle size={16} /> : <RefreshCw size={16} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-brand-text leading-none uppercase truncate max-w-[120px]">{item.merchant || item.name || 'General'}</span>
                        {item.isAIEnriched && !isSkipped && <Sparkles size={8} className="text-indigo-400" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{item.date}</span>
                        {item.isDuplicate && (
                          <span className="text-[6px] font-black uppercase tracking-tight bg-rose-500 text-white px-1 rounded">Duplicate</span>
                        )}
                        {item.isStale && !item.isDuplicate && (
                          <span className="text-[6px] font-black uppercase tracking-tight bg-amber-500 text-brand-headerText px-1 rounded">Stale</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-[13px] font-black tracking-tight ${isSkipped ? 'text-slate-500' : 'text-brand-text'}`}>
                      {currencySymbol}{Math.round(valToDisplay).toLocaleString()}
                    </span>
                    {!isSkipped && (
                      <div className="flex items-center gap-1.5 mt-1">
                         <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{item.category} • {item.subCategory}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!isSkipped && !isAccount && (
                  <div className="pt-3 border-t border-brand-border grid grid-cols-2 gap-3 animate-slide-up">
                    <div className="space-y-1">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Binding Account</span>
                      <div className="relative">
                        <select 
                          value={item.targetAccountId}
                          onChange={(e) => handleUpdateItem(item.tempId, { targetAccountId: e.target.value })}
                          className="w-full bg-brand-accent rounded-lg px-2 py-1.5 text-[9px] font-black outline-none border border-brand-border text-brand-text appearance-none"
                        >
                          <option value="">Choose...</option>
                          {liquidAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><X size={8} className="rotate-45" /></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Taxonomy</span>
                      <div className="flex gap-1">
                         {(['Needs', 'Wants', 'Avoids'] as Category[]).map(cat => (
                           <button
                             key={cat}
                             onClick={() => handleUpdateItem(item.tempId, { category: cat })}
                             className={`flex-1 py-1.5 rounded-lg text-[6px] font-black uppercase transition-all border ${
                               item.category === cat ? 'bg-brand-primary border-brand-primary text-brand-headerText' : 'bg-brand-accent border-brand-border text-slate-500'
                             }`}
                           >
                             {cat}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {item.intelligentNote && !isSkipped && (
                   <p className="text-[8px] font-bold text-slate-500 italic mt-1 px-1 leading-tight">
                     AI: "{item.intelligentNote}"
                   </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-brand-border bg-brand-surface flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-brand-accent text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancel Ingestion
          </button>
          <button 
            onClick={() => {
              triggerHaptic(20);
              const readyItems = items.filter(i => i.action === 'create');
              if (readyItems.length === 0) {
                 /* Added call to showToast from props */
                 showToast("No active signals to synchronize.", 'error');
                 return;
              }
              if (readyItems.some(i => i.entryType !== 'Account' && !i.targetAccountId)) {
                alert("Please bind all active transactions to a registry account.");
                return;
              }
              onConfirm(readyItems);
            }}
            className="flex-[2] bg-brand-primary text-brand-headerText font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all"
          >
            <Save size={18} /> Authorize Registry Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportReviewModal;
