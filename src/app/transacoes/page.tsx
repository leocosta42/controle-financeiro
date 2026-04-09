"use client";

import React, { useState, useEffect } from "react";
import NavigationShell from "../../components/NavigationShell";
import { TransactionRow } from "../../components/SharedUI";
import EditTransactionModal from "../../components/EditTransactionModal";
import { supabase } from "../../lib/supabaseClient";
import { getInvoicePeriod } from "../../lib/invoiceLogic";
import { Wallet, CreditCard, CalendarDays, Search, Trash2, ChevronLeft, ChevronRight, Filter, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function Transacoes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAllMonths, setIsAllMonths] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all"); // all, income, expense, credit

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-indexed

    // Precisamos buscar todos para as parcelas fluírem no tempo perfeitamente
    const { data: cards } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) {
      const filtered = data.filter(t => {
        if (isAllMonths) return true;
        
        const txY = parseInt(t.date.split('-')[0], 10);
        const txM = parseInt(t.date.split('-')[1], 10);
        return txY === year && txM === month;
      });
      setTransactions(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentDate, isAllMonths]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Deseja excluir as ${selectedIds.length} transações selecionadas?`)) {
      const { error } = await supabase.from('transactions').delete().in('id', selectedIds);
      if (!error) {
        setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
        setSelectedIds([]);
      }
    }
  };

  const handleEdit = (id: string) => {
    const t = transactions.find(t => t.id === id);
    if (t) setEditingTransaction(t);
  };

  const deleteTransaction = async (id: string) => {
    if (window.confirm("Certeza que deseja excluir esta transação?")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setSelectedIds(prev => prev.filter(item => item !== id));
      }
    }
  };

  const togglePaidTransaction = async (id: string, newState: boolean) => {
    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: newState })
      .eq('id', id);

    if (!error) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_paid: newState } : t));
    } else {
      console.error("Erro ao atualizar status de pagamento:", error);
      alert("Erro ao atualizar status.");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val));
  };

  const filteredTransactions = transactions.filter(t => {
    const term = searchTerm.trim().toLowerCase();
    const amountStrFormatted = String(t.amount).replace('.', ',');
    const matchesSearch = t.description.toLowerCase().includes(term) || 
                          (t.category && t.category.toLowerCase().includes(term)) ||
                          String(t.amount).includes(term) ||
                          amountStrFormatted.includes(term);
    
    if (typeFilter === "income") return matchesSearch && t.type === "income";
    if (typeFilter === "expense") return matchesSearch && (t.type === "expense" || t.type === "fixed");
    if (typeFilter === "credit") return matchesSearch && t.type === "credit";
    
    return matchesSearch;
  });

  return (
    <NavigationShell title="Histórico">
      
      {/* FILTROS E CONTROLES */}
      <div className="flex flex-col gap-6 mb-8">
        
        {/* TOP ROW: MONTH SELECTOR & SEARCH */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--card-border)] rounded-full p-1 shadow-sm">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAllMonths ? 'text-gray-500 opacity-40 cursor-not-allowed' : 'text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--card-border)]'}`}
                disabled={isAllMonths}
              >
                <ChevronLeft size={18} />
              </button>
              <span className={`text-sm font-semibold w-36 text-center capitalize transition-colors ${isAllMonths ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                {isAllMonths ? 'Período Total' : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAllMonths ? 'text-gray-500 opacity-40 cursor-not-allowed' : 'text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--card-border)]'}`}
                disabled={isAllMonths}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <button 
              onClick={() => setIsAllMonths(!isAllMonths)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${isAllMonths ? 'bg-indigo-500 text-white border-transparent' : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--card-border)] hover:bg-[var(--card-border)]'} shadow-sm`}
            >
              Todos
            </button>
          </div>

          <div className="relative w-full xl:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Pesquisar neste mês..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl pl-11 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-[var(--text-main)]"
            />
          </div>
        </div>

        {/* BOTTOM ROW: CHIPS & ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "Tudo", icon: <Filter size={14} /> },
              { id: "income", label: "Receitas", icon: <ArrowUpRight size={14} className="text-emerald-400" /> },
              { id: "expense", label: "Despesas", icon: <ArrowDownRight size={14} className="text-rose-400" /> },
              { id: "credit", label: "Cartão", icon: <CreditCard size={14} className="text-emerald-400" /> }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  typeFilter === f.id 
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                    : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--card-border)] hover:border-emerald-500/50"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-500/20"
            >
              <Trash2 size={14} /> Excluir Selecionados ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* LISTA AGRUPADA (TIMELINE) */}
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-4 sm:p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">Organizando histórico...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-16 h-16 bg-[var(--background)] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                  <Search size={24} className="text-[var(--text-muted)]/30" />
                </div>
                <p className="text-[var(--text-main)] font-semibold">Nenhum registro encontrado</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Tente mudar o mês ou o filtro de busca.</p>
              </div>
            ) : (
              (() => {
                const groups: { [key: string]: any[] } = {};
                filteredTransactions.forEach(t => {
                  const d = new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                  if (!groups[d]) groups[d] = [];
                  groups[d].push(t);
                });

                return Object.entries(groups).map(([date, items]) => {
                  const today = new Date().toLocaleDateString('pt-BR');
                  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');
                  
                  let displayDate = date;
                  if (date === today) displayDate = "Hoje";
                  else if (date === yesterday) displayDate = "Ontem";
                  else {
                    const [d, m, y] = date.split('/');
                    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                    displayDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                  }

                  return (
                    <div key={date} className="relative">
                      {/* STICKY DATE HEADER */}
                      <div className="sticky top-0 z-10 py-3 mb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--card-border)]/50">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-emerald-500 leading-none mb-0.5">
                              {date === today ? "" : date === yesterday ? "" : date.split('/')[1]}
                            </span>
                            <span className="text-lg font-bold text-emerald-500 leading-none">
                              {date === today ? "H" : date === yesterday ? "O" : date.split('/')[0]}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-[var(--text-main)] capitalize">
                              {displayDate}
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium">
                              {items.length} {items.length === 1 ? 'Lançamento' : 'Lançamentos'}
                            </p>
                          </div>
                   
                        </div>
                      </div>

                      {/* ITEMS FOR THIS DATE */}
                      <div className="space-y-3 pb-6">
                        {items.map(t => (
                          <TransactionRow
                            key={t.id} id={t.id}
                            type={t.type}
                            icon={t.type === 'credit' ? <CreditCard /> : <Wallet />}
                            name={t.description} category={t.category}
                            date="" // Date is already in header, hide to save space
                            amount={(t.type === 'expense' || t.type === 'credit' ? '- ' : '+ ') + formatCurrency(t.amount)}
                            isPositive={t.type === 'income'}
                            isPaid={t.is_paid} isSelected={selectedIds.includes(t.id)}
                            onTogglePaid={togglePaidTransaction} onSelect={handleSelect}
                            onDelete={deleteTransaction} onEdit={handleEdit}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
      </div>

      <EditTransactionModal 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        transaction={editingTransaction} 
        onSuccess={fetchTransactions} 
      />
    </NavigationShell>
  );
}
