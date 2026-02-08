import React, { useState } from 'react';
import { BudgetRule, Category, UserSettings } from '../types';
import { Plus, Trash2, Zap, Tag, Layers, Search, Workflow, Fingerprint, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { CATEGORY_COLORS } from '../constants';

interface RulesEngineProps {
  rules: BudgetRule[];
  settings: UserSettings;
  onAddRule: (rule: Omit<BudgetRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
}

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, settings, onAddRule, onDeleteRule }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [subCategory, setSubCategory] = useState('General');

  const handleAdd = () => {
    if (!keyword.trim()) return;
    triggerHaptic(20);
    onAddRule({ keyword: keyword.trim(), category, subCategory });
    setKeyword('');
    setIsAdding(false);
  };

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      {/* Updated Pane Header with themed gradient */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-4 mx-1 border border-white/5 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-base font-black text-brand-headerText tracking-tighter uppercase leading-none">Rule Engine</h1>
          <p className="text-[7px] font-black text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Registry Ingestion Logic</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className={`p-2 rounded-xl transition-all ${isAdding ? 'bg-white/20 text-brand-headerText' : 'bg-white/10 text-brand-headerText active:scale-95'}`}>
           {isAdding ? <X size={18} /> : <Plus size={18} strokeWidth={3} />}
        </button>
      </div>

      <div className="px-1 space-y-2">
        {isAdding && (
          <div className="bg-brand-surface p-6 rounded-[32px] border border-brand-border shadow-xl space-y-5 animate-kick">
            <div className="space-y-1.5">
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Detection Keyword</p>
               <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. Zomato, Rent, Netflix" className="w-full p-4 bg-brand-accent/20 rounded-2xl text-xs font-black outline-none border border-brand-border text-brand-text" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Bucket</p>
              <div className="flex bg-brand-accent/20 p-1 rounded-2xl border border-brand-border">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${category === cat ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-slate-600'}`}>{cat}</button>
                ))}
              </div>
            </div>
            <button onClick={handleAdd} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] active:scale-95">
              <Workflow size={16} /> Authorize Logic Node
            </button>
          </div>
        )}

        <div className="bg-brand-surface border border-brand-border rounded-[28px] overflow-hidden shadow-sm divide-y divide-brand-border">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <Fingerprint size={48} strokeWidth={1} />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">Zero active rules</p>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: CATEGORY_COLORS[rule.category] }}><Zap size={14} /></div>
                  <div>
                    <h4 className="font-black text-brand-text text-xs uppercase tracking-tight">{rule.keyword}</h4>
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{rule.category} • {rule.subCategory}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteRule(rule.id)} className="p-2 text-slate-700 hover:text-rose-500 active:scale-90 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RulesEngine;