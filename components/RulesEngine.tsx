import React from 'react';
import { BudgetRule, UserSettings } from '../types';
import { Trash2, Zap, Fingerprint, Edit2, Plus } from 'lucide-react';
import { CATEGORY_COLORS } from '../constants';
import { triggerHaptic } from '../utils/haptics';

interface RulesEngineProps {
  rules: BudgetRule[];
  settings: UserSettings;
  onAddRule: () => void;
  onEditRule: (rule: BudgetRule) => void;
  onDeleteRule: (id: string) => void;
}

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, onAddRule, onEditRule, onDeleteRule }) => {
  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-3 rounded-xl mb-4 mx-1 border border-white/5 shadow-md flex justify-between items-center h-[50px]">
        <div>
          <h1 className="text-[14px] font-black text-brand-headerText tracking-tight uppercase leading-none">Rule Engine</h1>
          <p className="text-[7px] font-black text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Registry Ingestion Logic</p>
        </div>
        <button 
          onClick={() => { triggerHaptic(); onAddRule(); }}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-brand-headerText transition-all active:scale-90"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="px-1 space-y-2">
        <div className="bg-brand-surface border border-brand-border rounded-[28px] overflow-hidden shadow-sm divide-y divide-brand-border">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <Fingerprint size={48} strokeWidth={1} />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">Zero active rules</p>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="p-4 flex items-center justify-between group hover:bg-brand-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: CATEGORY_COLORS[rule.category] }}>
                    <Zap size={14} />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-text text-xs uppercase tracking-tight">{rule.keyword}</h4>
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{rule.category} • {rule.mainCategory} • {rule.subCategory}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { triggerHaptic(); onEditRule(rule); }} 
                    className="p-2 text-slate-500 hover:text-brand-primary active:scale-90 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => { triggerHaptic(40); if(window.confirm('Delete this logic node?')) onDeleteRule(rule.id); }} 
                    className="p-2 text-slate-500 hover:text-rose-500 active:scale-90 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RulesEngine;