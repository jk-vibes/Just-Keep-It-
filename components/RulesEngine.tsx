import React from 'react';
import { BudgetRule, UserSettings } from '../types';
import { Trash2, Zap, Fingerprint } from 'lucide-react';
import { CATEGORY_COLORS } from '../constants';

interface RulesEngineProps {
  rules: BudgetRule[];
  settings: UserSettings;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
}

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, onDeleteRule }) => {
  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-4 mx-1 border border-white/5 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-base font-black text-brand-headerText tracking-tighter uppercase leading-none">Rule Engine</h1>
          <p className="text-[7px] font-black text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Registry Ingestion Logic</p>
        </div>
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