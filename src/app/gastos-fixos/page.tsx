"use client";

import React, { useState, useEffect } from "react";
import NavigationShell from "../../components/NavigationShell";
import EditTransactionModal from "../../components/EditTransactionModal";
import { supabase } from "../../lib/supabaseClient";
import { CalendarDays, Home, Smartphone, GraduationCap, Car, ShieldPlus, ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";

export default function GastosFixos() {
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const fetchFixed = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toLocaleDateString('en-CA');
    const lastDay = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'fixed')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: true }); // Order by nearest day
    
    if (data) {
      setFixedExpenses(data);
    }
  };

  useEffect(() => {
    fetchFixed();
  }, [currentDate]);

  const handleEdit = (id: string) => {
    const t = fixedExpenses.find(t => t.id === id);
    if (t) setEditingTransaction(t);
  };

  const deleteTransaction = async (id: string) => {
    if (window.confirm("Certeza que deseja excluir este agendamento fixo do mês?")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) {
        setFixedExpenses(prev => prev.filter(t => t.id !== id));
      }
    }
  };

  const todayStr = new Date().toLocaleDateString('en-CA');
  
  const totalFixed = fixedExpenses.reduce((acc, t) => acc + Number(t.amount), 0);
  const paidFixed = fixedExpenses.filter(t => t.date <= todayStr).reduce((acc, t) => acc + Number(t.amount), 0);
  const pendingFixed = totalFixed - paidFixed;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'moradia': return <Home />;
      case 'educacao': return <GraduationCap />;
      case 'transporte': return <Car />;
      case 'saude': return <ShieldPlus />;
      default: return <CalendarDays />;
    }
  }

  return (
    <NavigationShell title="Gastos Fixos Mensais">
      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[var(--text-muted)] text-sm md:text-base">
            Visualize as despesas agendadas para debito recorrente {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--card-border)] rounded-full p-1.5 self-start md:self-auto shadow-sm">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--card-border)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="text-sm font-semibold w-32 text-center capitalize text-[var(--text-main)]">
            {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </span>
          
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--card-border)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 transition-colors">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Fixo no Mês</p>
          <p className="text-3xl font-bold text-[var(--text-main)] tracking-tight">{formatCurrency(totalFixed)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 transition-colors">
          <p className="text-sm text-[var(--text-muted)] mb-1">Já Pago (até hoje)</p>
          <p className="text-3xl font-bold text-emerald-400 tracking-tight">{formatCurrency(paidFixed)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 transition-colors">
          <p className="text-sm text-[var(--text-muted)] mb-1">Pendente</p>
          <p className="text-3xl font-bold text-rose-400 tracking-tight">{formatCurrency(pendingFixed)}</p>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Despesas Programadas</h2>
          <span className="text-sm text-emerald-400 font-medium cursor-help" title="Despesas com vencimento igual ou menor que a data de hoje são consideradas automaticamente 'Pagas'.">Ajuda?</span>
        </div>
        
        <div className="space-y-4">
          {fixedExpenses.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              Sem contas fixas. Vá no botão superior "Nova Transação" e cadastre com a aba "Fixo".
            </div>
          ) : (
            fixedExpenses.map((item) => {
               const isPaid = item.date <= todayStr;
               const day = item.date.split('-')[2];

               return (
                 <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] hover:border-[var(--accent)]/30 transition-colors gap-4 group">
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--card)] border border-[var(--card-border)] text-[var(--text-muted)]'}`}>
                       <div className="scale-75">{getIcon(item.category)}</div>
                     </div>
                     <div>
                       <p className="font-semibold text-[var(--text-main)]">{item.description}</p>
                       <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Todo dia {day}</p>
                     </div>
                   </div>
                   <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                     <span className="font-bold text-[var(--text-main)]">{formatCurrency(item.amount)}</span>
                     <span className={`px-3 py-1 text-xs font-semibold rounded-full min-w-[90px] text-center ${isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                       {isPaid ? '✅ Pago' : '⏳ Aguardando'}
                     </span>
                     <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => handleEdit(item.id)}
                         className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                         title="Editar"
                       >
                         <Pencil size={16} />
                       </button>
                       <button 
                         onClick={() => deleteTransaction(item.id)}
                         className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                         title="Excluir"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                   </div>
                 </div>
               )
            })
          )}
        </div>
      </div>
      <EditTransactionModal 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        transaction={editingTransaction} 
        onSuccess={fetchFixed} 
      />
    </NavigationShell>
  );
}
