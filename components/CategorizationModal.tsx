import React, { useState, useEffect, useMemo } from 'react';
import { Expense, Category, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Check, ArrowRight, Sparkles, Loader2, BrainCircuit, Zap, X, ChevronLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { auditTransaction } from '../services/geminiService';
import { getCategoryIcon } from '../utils/iconUtils';

interface CategorizationModalProps {
  settings: UserSettings;
  expenses: Expense[];
  onConfirm: (id: string, updates: Partial<Expense>) => void;
  onClose: () => void;
}

const CategorizationModal: React.FC<CategorizationModalProps> = ({ settings, expenses, onConfirm, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMainCat, setSelectedMainCat] = useState<{ name: string; bucket: Category } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedCategory: string, suggestedSubCategory: string, insight: string } | null>(null);
  
  const current = expenses[currentIndex];
  const currencySymbol = getCurrencySymbol(settings.currency);

  const allMainCategories = useMemo(() => {
    const list: { name: string; bucket: Category; color: string }[] = [];
    const seen = new Set<string>();

    if (!settings.customCategories) return list;

    Object.entries(settings.customCategories).forEach(([bucket, mainCats]) => {
      Object.keys(mainCats).forEach(name => {
        if (!seen.has(name)) {
          seen.add(name);
          list.push({
            name,
            bucket: bucket as Category,
            color: CATEGORY_COLORS[bucket as Category]
          });
        }
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [settings.customCategories]);

  const subCategories = useMemo(() => {
    if (!selectedMainCat || !settings.customCategories) return [];
    return (settings.customCategories[selectedMainCat.bucket]?.[selectedMainCat.name] || ['General']).sort();
  }, [selectedMainCat, settings.customCategories]);

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

  const handleSubSelect = (subName: string) => {
    if (!selectedMainCat || !current) return;
    triggerHaptic(20);
    
    onConfirm(current.id, {
      category: selectedMainCat.bucket,
      mainCategory: selectedMainCat.name,
      subCategory: subName,
      isConfirmed: true
    });

    setSelectedMainCat(null);
    // Note: We don't increment index here because the parent filters confirmed items out of the list.
    // The next item in the list will automatically become the 'current' item at index 0.
  };

  const handleApplySuggestion = () => {
    if (aiSuggestion && current) {
      triggerHaptic(40);
      
      onConfirm(current.id, {
        category: aiSuggestion.suggestedCategory as Category,
        mainCategory: aiSuggestion.suggestedCategory, 
        subCategory: aiSuggestion.suggestedSubCategory,
        isConfirmed: true,
        isAIUpgraded: true
      });

      setSelectedMainCat(null);
      // Parent handles list filtering; next item shifts to current position.
    }
  };

  if (!current) {
    return (
      <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-brand-surface w-full max-w-xs rounded-[32px] border border-brand-border shadow-2xl p-6 text-center animate-slide-up">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check size={24} strokeWidth={3} />
          </div>
          <h2 className="text-base font-black text-brand-text uppercase tracking-tighter">Queue Clear</h2>
          <p className="text-slate-500 text-[9px] mb-6 font-bold uppercase tracking-widest leading-relaxed">Registry Synced.</p>
          <button 
            onClick={() => { triggerHaptic(); onClose(); }}
            className="w-full bg-brand-primary text-brand-headerText font-black py-3 rounded-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-[9px]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] border border-brand-border shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">
        
        <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between bg-brand-accent/50 shrink-0">
          <div className="flex items-center gap-2">
            {selectedMainCat ? (
              <button 
                onClick={() => { triggerHaptic(); setSelectedMainCat(null); }}
                className="p-1 bg-brand-accent rounded-lg text-slate-400 active:scale-90"
              >
                <ChevronLeft size={16} />
              </button>
            ) : (
              <div className="bg-brand-primary text-brand-headerText p-1 rounded-lg">
                <BrainCircuit size={16} />
              </div>
            )}
            <span className="font-black text-brand-text uppercase text-[9px] tracking-[0.2em]">
              {selectedMainCat ? 'Select Sub-Category' : 'Neural Audit'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-brand-primary text-[9px] tracking-widest">{expenses.length} Remaining</span>
            <button onClick={onClose} className="p-1 bg-brand-accent rounded-full text-slate-400 active:scale-90">
               <X size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-3 overflow-y-auto no-scrollbar space-y-3">
          
          {!selectedMainCat && (
            <div className="text-center space-y-0.5 w-full px-2 animate-kick">
              <h2 className="text-lg font-black text-brand-text tracking-tighter truncate leading-tight uppercase">
                {current.merchant || 'Unidentified'}
              </h2>
              <div className="text-2xl font-black text-brand-text tracking-tighter">
                <span className="text-sm opacity-30 mr-1 font-bold">{currencySymbol}</span>
                {Math.round(current.amount).toLocaleString()}
              </div>
              {current.note && current.note !== current.merchant && (
                 <p className="text-[8px] font-bold text-slate-500 italic mt-1 line-clamp-1 opacity-70">
                   "{current.note}"
                 </p>
              )}
            </div>
          )}

          {!selectedMainCat && (
            <div className="w-full animate-kick">
              <div className="bg-indigo-600 rounded-[20px] p-3 shadow-xl relative overflow-hidden border border-indigo-400/20">
                <div className="absolute top-0 right-0 p-1 opacity-10 text-white pointer-events-none">
                  <Sparkles size={32} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="bg-white/20 p-1 rounded-md text-white backdrop-blur-md">
                       <Zap size={9} fill="currentColor" />
                    </div>
                    <span className="text-[7px] font-black text-indigo-100 uppercase tracking-[0.2em]">Prediction Engine</span>
                  </div>

                  {isAnalyzing ? (
                    <div className="flex flex-col items-center py-1 gap-1.5">
                       <Loader2 size={14} className="animate-spin text-white/50" />
                       <p className="text-[6px] font-bold text-white/70 uppercase tracking-widest animate-pulse">Consulting Master Grid...</p>
                    </div>
                  ) : aiSuggestion ? (
                    <div className="animate-kick">
                      <div className="text-white mb-2">
                        <div className="flex flex-wrap items-center gap-1">
                           <span className="bg-white/20 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight border border-white/10">{aiSuggestion.suggestedCategory}</span>
                           <ArrowRight size={7} className="opacity-50" />
                           <span className="bg-white/20 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight border border-white/10">{aiSuggestion.suggestedSubCategory}</span>
                        </div>
                      </div>
                      <button 
                        onClick={handleApplySuggestion}
                        className="w-full bg-white text-indigo-600 font-black py-2 rounded-xl shadow-lg hover:bg-indigo-50 active:scale-95 transition-all text-[8px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Check size={10} strokeWidth={4} /> Confirm Match
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-0.5">
                      <p className="text-[7px] font-black text-indigo-200 uppercase tracking-widest">Awaiting Signal</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="w-full space-y-1.5 flex-1">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 px-1">
              {selectedMainCat ? `Sub-nodes for ${selectedMainCat.name}` : 'Assign Taxonomy'}
            </p>
            
            {!selectedMainCat ? (
              <div className="grid grid-cols-2 gap-1.5 animate-kick pb-2">
                {allMainCategories.map(cat => (
                  <button 
                    key={cat.name}
                    onClick={() => { triggerHaptic(); setSelectedMainCat({ name: cat.name, bucket: cat.bucket }); }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-brand-accent border border-brand-border active:scale-95 transition-all group text-left"
                  >
                    <div 
                      className="p-1.5 rounded-lg bg-opacity-10 shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {getCategoryIcon(cat.bucket, cat.name, undefined, undefined, 14)}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tight text-brand-text truncate block">{cat.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 animate-kick pb-2">
                {subCategories.map(sub => (
                  <button 
                    key={sub}
                    onClick={() => handleSubSelect(sub)}
                    className="p-2.5 rounded-xl bg-brand-accent border border-brand-border active:scale-95 transition-all text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-tight text-brand-text truncate">{sub}</span>
                      <span className="text-[5px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Endpoint Node</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-3 bg-brand-accent/50 border-t border-brand-border text-center shrink-0">
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em]">
            Authorized Manual Link
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategorizationModal;