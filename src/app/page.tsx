"use client";

import React, { useState, useEffect } from "react";
import NavigationShell from "../components/NavigationShell";
import { SummaryCard, TransactionRow } from "../components/SharedUI";
import EditTransactionModal from "../components/EditTransactionModal";
import { supabase } from "../lib/supabaseClient";
import { getInvoicePeriod } from "../lib/invoiceLogic";
import Link from "next/link";
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, CalendarDays, Plus, ChevronLeft, ChevronRight, PieChart as PieIcon, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // Expandimos a busca para o mês anterior para capturar compras de cartão de crédito
    // que caem na fatura do mês atual.
    const fetchStart = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
    const fetchEnd = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

    const { data: fetchCards } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
    if (fetchCards) setCards(fetchCards);

    // Buscamos todo o histórico de transações, pois compras parceladas antigas
    // (ex: de Dezembro) podem perfeitamente gerar faturas agora no mês atual (ex: Abril).
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) {
      const targetYear = year;
      const targetMonth = month + 1;

      // Filtro inteligente: Despesas normais pelo mês literal, Cartão pelo mês da fatura
      const filtered = data.filter(t => {
        if (t.type === 'credit') {
          const card = fetchCards?.find(c => c.id === t.credit_card_id);
          if (!card) return false;
          const { invoiceYear, invoiceMonth } = getInvoicePeriod(t.date, card.closing_day, card.due_day, t.description);
          return invoiceYear === targetYear && invoiceMonth === targetMonth;
        } else {
          // Para evitar confusão de fuso horário, tratamos as strings YYYY-MM-DD
          const txM = parseInt(t.date.split('-')[1], 10);
          const txY = parseInt(t.date.split('-')[0], 10);
          return txY === targetYear && txM === targetMonth;
        }
      });
      setTransactions(filtered);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // Also fetch recent once or on every date change if we want it truly fresh
    // But usually better on every change to keep it in sync
  }, [currentDate]);

  const handleEdit = (id: string) => {
    const t = transactions.find(t => t.id === id);
    if (t) setEditingTransaction(t);
  };

  const deleteTransaction = async (id: string) => {
    if (window.confirm("Certeza que deseja excluir esta transação?")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) {
        setTransactions(prev => prev.filter(t => t.id !== id));
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

  const toggleGroupPaid = async (type: string, cardId?: string) => {
    let obligations = [];
    if (type === 'fixed') {
       obligations = transactions.filter(t => t.type === 'fixed');
    } else if (type === 'credit' && cardId) {
       obligations = transactions.filter(t => t.type === 'credit' && t.credit_card_id === cardId);
    }

    if (obligations.length === 0) return;
    const allPaid = obligations.every(t => t.is_paid);
    const newState = !allPaid;

    const ids = obligations.map(t => t.id);
    const { error } = await supabase.from('transactions').update({ is_paid: newState }).in('id', ids);

    if (!error) {
       setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, is_paid: newState } : t));
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' || t.type === 'fixed').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalFixedOnly = transactions.filter(t => t.type === 'fixed').reduce((acc, t) => acc + Number(t.amount), 0);
  
  const totalObligations = totalCredit + totalFixedOnly;
  const balance = totalIncome - totalExpense - totalCredit;

  const obligationsList = transactions.filter(t => t.type === 'credit' || t.type === 'fixed');
  const isBillPaid = obligationsList.length > 0 && obligationsList.every(t => t.is_paid);

  const fixedObligations = transactions.filter(t => t.type === 'fixed');
  const hasFixed = fixedObligations.length > 0;
  const isFixedPaid = hasFixed && fixedObligations.every(t => t.is_paid);
  const fixedTotal = fixedObligations.reduce((acc, t) => acc + Number(t.amount), 0);

  const cardGroups = cards.map(c => {
     const txs = transactions.filter(t => t.type === 'credit' && t.credit_card_id === c.id);
     if (txs.length === 0) return null;
     return {
        card: c,
        total: txs.reduce((acc, t) => acc + Number(t.amount), 0),
        isPaid: txs.every(t => t.is_paid)
     };
  }).filter(Boolean);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val));
  };

  const expenses = transactions.filter(t => t.type === 'expense' || t.type === 'fixed' || t.type === 'credit');
  const catMap = new Map();
  expenses.forEach(t => {
     const rawName = t.category || 'Outros';
     const catName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
     catMap.set(catName, (catMap.get(catName) || 0) + Number(t.amount));
  });
  
  const categoryData = Array.from(catMap.entries())
    .map(([name, value]) => ({name, value}))
    .filter(item => item.value > 0)
    .sort((a,b) => b.value - a.value);

  // Paleta vasta para evitar repetição de cor lado a lado quando tem muitas fatias
  const CHART_COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#64748b'];

  return (
    <NavigationShell title="Visão Geral">
      {/* HEADER & MENU MÊS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[var(--text-muted)] text-sm md:text-base">
            Aqui está o resumo do seu fluxo de caixa confidencial deste mês específico.
          </p>
        </div>

        {/* MONTH SELECTOR */}
        <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--card-border)] rounded-full p-1.5 self-start md:self-auto shadow-sm">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--card-border)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="text-sm font-semibold w-32 text-center capitalize text-[var(--text-main)]">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--card-border)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Balanço Mensal"
          value={`R$ ${balance < 0 ? '-' : ''}${formatCurrency(balance).replace('R$', '').trim()}`}
          trend=""
          isPositive={balance >= 0}
          subtitle="resultado deste período"
          color="emerald"
        />
        <SummaryCard
          title="Receitas"
          value={formatCurrency(totalIncome)}
          trend=""
          isPositive={true}
          icon={<ArrowUpRight size={20} className="text-emerald-500" />}
          color="emerald"
        />
        <SummaryCard
          title="Despesas"
          value={formatCurrency(totalExpense + totalCredit)}
          trend=""
          isPositive={false}
          icon={<ArrowDownRight size={20} className="text-rose-500" />}
          color="rose"
        />
      </div>

      {/* CHARTS & CARDS AREA */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
        
        {/* GRÁFICO DE DESPESAS */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-8 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-main)]">Gráfico de Gastos</h2>
            <PieIcon size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 w-full min-h-[420px] flex items-center justify-center">
            {categoryData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center">Nenhuma despesa para exibir.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, bottom: 20, left: 10, right: 10 }}>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    <Label 
                      value="TOTAL"
                      position="center" 
                      className="fill-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest"
                      dy={-12}
                    />
                    <Label 
                      value={formatCurrency(categoryData.reduce((acc, curr) => acc + curr.value, 0))}
                      position="center" 
                      className="fill-[var(--text-main)] text-xl font-black drop-shadow-sm"
                      dy={8}
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', borderRadius: '16px', color: 'var(--text-main)', border: '1px solid var(--card-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle" 
                    formatter={(value) => <span className="text-[var(--text-muted)] font-semibold text-xs ml-1">{value}</span>}
                    wrapperStyle={{ paddingTop: '30px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* COMPROMISSOS PROJEÇÃO */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-8 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-main)]">Compromissos do Mês</h2>
            <CreditCard size={20} className="text-[var(--text-muted)]" />
          </div>
          
          <div className={`flex-1 bg-gradient-to-br ${isBillPaid ? 'from-emerald-600 to-teal-800' : 'from-emerald-500 to-teal-700'} rounded-[2.5rem] p-6 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden group border border-white/10`}>
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            
            <div className="flex justify-between items-start z-10 gap-2 mb-4">
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-white/70 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-2">Total de Compromissos</p>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-sm truncate">{formatCurrency(totalObligations)}</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 z-10 w-full mb-6">
              {hasFixed && (
                 <div className="flex items-center justify-between bg-black/10 hover:bg-black/20 rounded-2xl p-3 border border-white/5 transition-colors group/item">
                    <div>
                       <p className="text-white font-bold text-sm">Gastos Fixos</p>
                       <p className="text-white/70 text-xs font-medium">{formatCurrency(fixedTotal)}</p>
                    </div>
                    <button onClick={() => toggleGroupPaid('fixed')} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md border ${isFixedPaid ? 'bg-white text-emerald-600 border-white' : 'bg-black/20 text-white/50 border-white/10 hover:bg-black/40 hover:text-white'}`} title="Dar Baixa nos Gastos Fixos">
                       <CheckCircle2 size={20} />
                    </button>
                 </div>
              )}

              {cardGroups.map((g: any) => (
                 <div key={g.card.id} className="flex items-center justify-between bg-black/10 hover:bg-black/20 rounded-2xl p-3 border border-white/5 transition-colors group/item">
                    <div>
                       <p className="text-white font-bold text-sm">Fatura {g.card.name}</p>
                       <p className="text-white/70 text-xs font-medium">{formatCurrency(g.total)}</p>
                    </div>
                    <button onClick={() => toggleGroupPaid('credit', g.card.id)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md border ${g.isPaid ? 'bg-white text-emerald-600 border-white' : 'bg-black/20 text-white/50 border-white/10 hover:bg-black/40 hover:text-white'}`} title={`Dar Baixa Fatura ${g.card.name}`}>
                       <CheckCircle2 size={20} />
                    </button>
                 </div>
              ))}
              
              {!hasFixed && cardGroups.length === 0 && (
                <div className="text-center py-4 text-white/50 text-sm">
                  Sem obrigações pendentes neste mês.
                </div>
              )}
            </div>
            
            <div className="mt-12 z-10">
              <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden mb-5">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isBillPaid ? 'bg-white/90 w-full shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'bg-white/40 w-1/3'}`}></div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isBillPaid ? 'bg-white' : 'bg-rose-400'}`}></div>
                <span className="text-xs text-white uppercase tracking-wider font-bold">
                  {isBillPaid ? 'Tudo em dia! ✨' : 'Aguardando Pagamento'}
                </span>
              </div>
            </div>
          </div>
        </div>

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
