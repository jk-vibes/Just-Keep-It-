import React, { useState, useEffect } from 'react';
import { Expense, Category, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, ArrowRight, Building2, Sparkles, Loader2, BrainCircuit, Zap, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { auditTransaction } from '../services/geminiService';

interface CategorizationModalProps {
  settings: UserSettings;
  expenses: Expense[];
  onConfirm: (id: string, category: Category, subCategory?: string) => void;
  onClose: () => void;
}

const CategorizationModal: React.FC<CategorizationModalProps> = ({ settings, expenses, onConfirm, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedCategory: string, suggestedSubCategory: string, insight: string } | null>(null);
  
  const current = expenses[currentIndex];
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    const getSuggestion = async () => {
      if (!current) return;
      
      setIsAnalyzing(true);
      setAiSuggestion(null);
      
      try {
        const result = await auditTransaction(current, settings.currency);
        if (result) {
          setAiSuggestion({
            suggestedCategory: result.suggestedCategory,
            suggestedSubCategory: result.suggestedSubCategory,
            insight: result.insight
          });
        }
      } catch (e) {
        console.error("AI Categorization failed", e);
      } finally {
        setIsAnalyzing(false);
      }
    };

    getSuggestion();
  }, [current, settings.currency]);

  const handleSelection = (cat: Category) => {
    triggerHaptic();
    onConfirm(current.id, cat);
    setCurrentIndex(currentIndex + 1);
  };

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      triggerHaptic(30);
      onConfirm(current.id, aiSuggestion.suggestedCategory as Category, aiSuggestion.suggestedSubCategory);
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!current) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[160] flex flex-col items-center justify-center p-6 text-center animate-slide-up">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[32px] flex items-center justify-center mb-6 shadow-lg">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">Registry Synchronized</h2>
        <p className="text-slate-500 text-sm mb-8 max-w-[240px] font-medium leading-relaxed">Your financial signals have been successfully audited and categorized.</p>
        <button 
          onClick={() => { triggerHaptic(); onClose(); }}
          className="w-full max-w-xs bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-[24px] shadow-xl active:scale-95 transition-transform uppercase tracking-widest text-[10px]"
        >
          Return to Command Center
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[160] flex flex-col animate-slide-up overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="bg-brand-primary text-white p-1.5 rounded-lg shadow-sm">
            <BrainCircuit size={16} />
          </div>
          <span className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-[0.2em]">Neural Audit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-brand-primary text-[10px] tracking-widest">{currentIndex + 1} OF {expenses.length}</span>
          <button onClick={onClose} className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 active:scale-90 transition-transform">
             <X size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar">
        <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-[36px] flex items-center justify-center text-slate-200 dark:text-slate-700 mb-8 border border-slate-100 dark:border-slate-700 shadow-inner group">
          <Building2 size={40} className="group-hover:scale-110 transition-transform duration-500" />
        </div>
        
        <div className="text-center space-y-1 mb-10 w-full">
          <h3 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[8px]">Transaction Signature</h3>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter truncate px-4">{current.merchant || 'Unidentified'}</h2>
          <div className="text-5xl font-black text-slate-900 dark:text-white mt-4 tracking-tighter">
            <span className="text-xl opacity-30 mr-1 font-bold">{currencySymbol}</span>
            {Math.round(current.amount).toLocaleString()}
          </div>
        </div>

        {/* AI Suggestion Box */}
        <div className="w-full max-w-sm mb-10">
          <div className="bg-indigo-600 rounded-[32px] p-6 shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group border border-indigo-400/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-white group-hover:scale-110 transition-transform pointer-events-none">
              <Sparkles size={64} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-white/20 p-1.5 rounded-lg text-white backdrop-blur-md">
                   <Zap size={14} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Semantic Prediction</span>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-4 gap-3">
                   <Loader2 size={24} className="animate-spin text-white/50" />
                   <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest animate-pulse">Scanning Historical Context...</p>
                </div>
              ) : aiSuggestion ? (
                <div className="animate-kick">
                  <div className="text-white text-sm font-bold leading-snug mb-5">
                    Match found in global database:
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                       <span className="bg-white/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm border border-white/10">{aiSuggestion.suggestedCategory}</span>
                       <ArrowRight size={10} className="opacity-50" />
                       <span className="bg-white/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm border border-white/10">{aiSuggestion.suggestedSubCategory}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleApplySuggestion}
                    className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-50 active:scale-95 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Check size={16} strokeWidth={4} /> Authorize Prediction
                  </button>
                  {aiSuggestion.insight && (
                    <p className="mt-4 text-[9px] font-bold text-indigo-200/80 italic leading-relaxed text-center px-2">
                      "{aiSuggestion.insight}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Prediction Engine Standby</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Manual Correction Override</p>
          <div className="grid grid-cols-3 gap-3">
            {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
              <button 
                key={cat}
                onClick={() => handleSelection(cat)}
                className="flex flex-col items-center gap-2 p-4 rounded-[24px] bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all group"
              >
                <div className="w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorizationModal;