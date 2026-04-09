"use client";

import React from "react";
import { Trash2, Pencil, CheckCircle2, Circle } from "lucide-react";

export function SummaryCard({ title, value, trend, isPositive, subtitle, icon, color }: any) {
  return (
    <div className="bg-[var(--card)] border border-[var(--card-border)] p-6 rounded-3xl transition-all hover:border-[var(--accent)]/30 group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[var(--text-muted)] font-medium text-sm">{title}</h3>
        {icon && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">{value}</p>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend}
          </span>
        )}
        <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
      </div>
    </div>
  );
}

export function TransactionRow({ id, type, icon, name, category, date, amount, isPositive, onDelete, onEdit, isSelected, onSelect, isPaid, onTogglePaid }: any) {
  return (
    <div 
      onClick={() => onSelect && onSelect(id)}
      className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 group p-3 hover:bg-[var(--accent)]/5 rounded-2xl transition-colors border ${isSelected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-transparent hover:border-[var(--card-border)]'} cursor-pointer`}
    >
      {/* COLUMN 1: ICON/SELECT */}
      <div className="flex items-center gap-3">
        {onSelect && (
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-[var(--card-border)] group-hover:border-emerald-500/50'}`}>
              {isSelected && <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 -mt-0.5"></div>}
            </div>
          </div>
        )}
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--background)] border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center text-[var(--text-muted)] group-hover:border-[var(--accent)]/30 transition-colors ${isPaid ? 'opacity-40 grayscale' : ''}`}>
          <div className="scale-75">{icon}</div>
        </div>
      </div>

      {/* COLUMN 2: DESCRIPTION (FLEXIBLE) */}
      <div className="min-w-0 pr-2">
        <p className={`font-semibold text-[var(--text-main)] text-sm sm:text-base truncate ${isPaid ? 'opacity-40 line-through decoration-[var(--text-muted)]' : ''}`}>
          {name}
        </p>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">
          <span className="truncate">{category}</span>
          {date && (
            <>
              <span className="w-1 h-1 rounded-full bg-[var(--card-border)] flex-shrink-0"></span>
              <span className="whitespace-nowrap">{date}</span>
            </>
          )}
        </div>
      </div>

      {/* COLUMN 3: AMOUNT (FIXED ALIGNMENT) */}
      <div className={`font-bold text-sm sm:text-base tracking-tight whitespace-nowrap text-right justify-self-end ${isPaid ? 'opacity-40 line-through text-[var(--text-muted)]' : (isPositive ? 'text-emerald-400' : 'text-[var(--text-main)]')}`}>
        {amount}
      </div>
        
      {/* COLUMN 4: ACTION BUTTONS (DEDICATED SPACE) */}
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-w-[32px] sm:min-w-[70px] justify-end">
        {(onTogglePaid && type?.toLowerCase() !== 'credit') && (
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePaid(id, !isPaid); }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${isPaid ? 'text-emerald-500' : 'text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10'}`}
            title={isPaid ? "Marcar como pendente" : "Marcar como pago"}
          >
            <CheckCircle2 size={16} />
          </button>
        )}
        {onEdit && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(id); }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Editar lançamento"
          >
            <Pencil size={14} />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Excluir lançamento"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
