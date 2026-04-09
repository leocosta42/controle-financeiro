"use client";

import React, { useState, useEffect } from "react";
import NavigationShell from "../../components/NavigationShell";
import { TransactionRow } from "../../components/SharedUI";
import { supabase } from "../../lib/supabaseClient";
import { getInvoicePeriod } from "../../lib/invoiceLogic";
import { CreditCard, Plus, Trash2, X, ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";

export default function Cartoes() {
  const [cards, setCards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', limit: '', closingDay: '28', dueDay: '5' });
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const { data: cardsData } = await supabase.from('credit_cards').select('*').order('created_at', { ascending: true });
    const { data: txData } = await supabase.from('transactions').select('*').eq('type', 'credit').order('date', { ascending: true });
    
    if (cardsData) {
      setCards(cardsData);
      
      // Init selected invoices to current month for each card
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const initials = cardsData.reduce((acc, c) => ({...acc, [c.id]: currentMonthStr}), {});
      setSelectedInvoices(initials);
    }
    if (txData) setTransactions(txData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const deleteCard = async (id: string, e: any) => {
    e.stopPropagation();
    if (window.confirm("Certeza que deseja excluir este cartão e todas as futuras faturas dele?")) {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const nameLower = newCard.name.toLowerCase();
    let determinedColor = "";

    if (nameLower.includes("nubank") || nameLower.includes("roxinho") || nameLower.includes("violeta")) {
      determinedColor = "from-emerald-600 to-emerald-950";
    } else if (nameLower.includes("itaú") || nameLower.includes("itau")) {
      determinedColor = "from-orange-500 to-orange-700";
    } else if (nameLower.includes("inter")) {
      determinedColor = "from-orange-400 to-orange-600";
    } else if (nameLower.includes("bradesco") || nameLower.includes("santander")) {
      determinedColor = "from-red-600 to-red-800";
    } else if (nameLower.includes("c6") || nameLower.includes("carbon")) {
      determinedColor = "from-zinc-800 to-black";
    } else if (nameLower.includes("caixa") || nameLower.includes("azul")) {
      determinedColor = "from-blue-600 to-blue-800";
    } else if (nameLower.includes("brasil") || nameLower.includes("bb ") || nameLower.includes("ourocard")) {
      determinedColor = "from-yellow-400 to-blue-800";
    } else if (nameLower.includes("xp") || nameLower.includes("modal")) {
      determinedColor = "from-yellow-600 to-black";
    } else if (nameLower.includes("picpay")) {
      determinedColor = "from-emerald-400 to-emerald-600";
    } else if (nameLower.includes("sicredi") || nameLower.includes("next")) {
      determinedColor = "from-green-500 to-green-700";
    } else if (nameLower.includes("black")) {
      determinedColor = "from-zinc-900 to-black";
    } else {
      const colors = [
        "from-emerald-600 to-teal-800",
        "from-rose-600 to-pink-800",
        "from-emerald-500 to-teal-800",
        "from-sky-500 to-blue-800",
        "from-slate-700 to-slate-900"
      ];
      determinedColor = colors[Math.floor(Math.random() * colors.length)];
    }

    const { error } = await supabase.from('credit_cards').insert([{
      user_id: user?.id,
      name: newCard.name,
      limit_amount: Number(newCard.limit),
      closing_day: Number(newCard.closingDay),
      due_day: Number(newCard.dueDay),
      color: determinedColor
    }]);

    if (!error) {
       setShowModal(false);
       setNewCard({ name: '', limit: '', closingDay: '28', dueDay: '5' });
       fetchData();
    } else {
       alert("Erro ao criar cartão: " + error.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const changeInvoiceMonth = (cardId: string, delta: number) => {
    setSelectedInvoices(prev => {
      const current = prev[cardId];
      if (!current) return prev;
      const [year, month] = current.split('-').map(Number);
      let newDate = new Date(year, month - 1 + delta, 1);
      return {
        ...prev,
        [cardId]: `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
      };
    });
  };

  if (loading) return <NavigationShell title="Cartões de Crédito"><div className="p-8 text-[var(--text-muted)] animate-pulse">Carregando cartões e faturas...</div></NavigationShell>;

  return (
    <NavigationShell title="Cartões de Crédito">
      
      <div className="flex justify-end mb-6">
         <button 
           onClick={() => setShowModal(true)}
           className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-full flex items-center gap-2 transition-all shadow-md"
         >
           <Plus size={16} /> Ver Novo Cartão
         </button>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8 pb-32">
        {cards.map(card => {
          // Calculate used limit
          const cardTxs = transactions.filter(t => t.credit_card_id === card.id);
          const unpaidTotal = cardTxs.filter(t => !t.is_paid).reduce((acc, t) => acc + Number(t.amount), 0);
          const limitPercent = Math.min(100, Math.max(0, (unpaidTotal / card.limit_amount) * 100));
          const limitColor = limitPercent > 85 ? 'bg-rose-500' : limitPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500';

          // Current View Invoice
          const invKey = selectedInvoices[card.id];
          const [invYear, invMonth] = invKey ? invKey.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
          const invoiceTxs = cardTxs.filter(t => {
            const { invoiceYear, invoiceMonth } = getInvoicePeriod(t.date, card.closing_day, card.due_day, t.description);
            return invoiceYear === invYear && invoiceMonth === invMonth;
          });
          const invoiceTotal = invoiceTxs.reduce((acc, t) => acc + Number(t.amount), 0);

          // Category Math
          const catMap = new Map();
          invoiceTxs.forEach(t => {
             const catName = t.category || 'Outros';
             catMap.set(catName, (catMap.get(catName) || 0) + Number(t.amount));
          });
          const catData = Array.from(catMap.entries()).map(([k,v]) => ({name: k, value: Number(v)})).sort((a,b) => b.value - a.value);

          const allPaid = invoiceTxs.length > 0 && invoiceTxs.every(t => t.is_paid);
          
          let closingDateMonth = invMonth - 1; 
          if (Number(card.due_day) < Number(card.closing_day)) {
              closingDateMonth -= 1; // Se a fatura é paga no mês 4, mas fecha antes do dia 5 (ex: dia 28), o fechamento real ocorreu no mês 3!
          }
          const closingDate = new Date(invYear, closingDateMonth, Number(card.closing_day));
          closingDate.setHours(23, 59, 59, 999);
          
          const isClosed = new Date() > closingDate;

          let invoiceStatusText = 'ABERTO/FUTURO';
          let invoiceStatusColor = 'text-emerald-400';

          if (invoiceTxs.length === 0) {
              invoiceStatusText = 'SEM GASTOS';
              invoiceStatusColor = 'text-[var(--text-muted)]';
          } else if (allPaid) {
              invoiceStatusText = 'FATURA PAGA ✨';
              invoiceStatusColor = 'text-teal-400';
          } else if (isClosed) {
              invoiceStatusText = 'FECHADA / PENDENTE';
              invoiceStatusColor = 'text-rose-400';
          }

          return (
            <div key={card.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 shadow-sm flex flex-col gap-6 w-full">
              
              {/* TOP HEADER - CARD INFO */}
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Visual Card Representation */}
                <div className={`w-full md:w-80 h-48 bg-gradient-to-br ${card.color} rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden shrink-0`}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex justify-between items-start z-10">
                    <p className="text-white font-medium text-lg">{card.name}</p>
                    <button onClick={(e) => deleteCard(card.id, e)} className="text-white/30 hover:text-white transition-opacity"><Trash2 size={18} /></button>
                  </div>
                  <div className="z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard size={16} className="text-white/70" />
                      <p className="text-xs text-white/70 uppercase tracking-widest">Mastercard</p>
                    </div>
                    <p className="text-2xl font-bold text-white tracking-widest mt-2">{formatCurrency(card.limit_amount)}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Limite do Cartão</p>
                  </div>
                </div>

                {/* Limit Progress & Rules */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                     <h3 className="text-[var(--text-main)] font-semibold text-sm uppercase tracking-wider">Consumo do Limite</h3>
                     <span className="text-[var(--text-muted)] text-sm font-medium">{formatCurrency(unpaidTotal)} / {formatCurrency(card.limit_amount)}</span>
                  </div>
                  <div className="w-full bg-[var(--background)] h-3 rounded-full overflow-hidden mb-4 border border-[var(--card-border)]">
                    <div className={`h-full rounded-full transition-all duration-1000 ${limitColor} shadow-[0_0_10px_currentColor] opacity-90`} style={{ width: `${limitPercent}%` }}></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                     <div className="bg-[var(--background)] p-3 rounded-xl border border-[var(--card-border)]">
                        <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Fechamento</p>
                        <p className="font-semibold text-[var(--text-main)] text-sm">Todo dia {card.closing_day}</p>
                     </div>
                     <div className="bg-[var(--background)] p-3 rounded-xl border border-[var(--card-border)]">
                        <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Vencimento</p>
                        <p className="font-semibold text-[var(--text-main)] text-sm">Dia {card.due_day}</p>
                     </div>
                  </div>
                </div>
              </div>

              {/* INVOICE CAROUSEL AND CATEGORIES */}
              <div className="border-t border-[var(--card-border)] pt-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                 
                 {/* Left side: Invoice Timeline */}
                 <div>
                   <div className="flex items-center justify-between bg-[var(--background)] rounded-2xl p-2 border border-[var(--card-border)] mb-4">
                      <button onClick={() => changeInvoiceMonth(card.id, -1)} className="p-2 hover:bg-[var(--card)] rounded-xl transition-colors text-[var(--text-muted)]"><ChevronLeft size={20}/></button>
                      <div className="text-center">
                         <p className="text-[var(--text-main)] font-bold">{monthNames[invMonth - 1]} {invYear}</p>
                         <p className={`text-xs font-semibold uppercase tracking-wider ${invoiceStatusColor}`}>
                            {invoiceStatusText}
                         </p>
                      </div>
                      <button onClick={() => changeInvoiceMonth(card.id, 1)} className="p-2 hover:bg-[var(--card)] rounded-xl transition-colors text-[var(--text-muted)]"><ChevronRight size={20}/></button>
                   </div>
                   
                   <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[var(--text-main)] font-semibold">Total da Fatura</h4>
                     <p className="text-xl font-bold text-rose-400">{formatCurrency(invoiceTotal)}</p>
                   </div>
                   
                   {/* Transactions List */}
                   <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {invoiceTxs.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] text-center py-4">Fatura zerada neste mês.</p>
                      ) : (
                        invoiceTxs.map(t => (
                          <div key={t.id} className="flex justify-between items-center bg-[var(--background)] p-3 rounded-xl border border-[var(--card-border)] hover:border-[var(--accent)]/30 transition-colors gap-3">
                             <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                               <CreditCard size={14}/>
                             </div>
                             <div className="flex-1 overflow-hidden">
                               <p className="text-sm font-medium text-[var(--text-main)] truncate">{t.description}</p>
                               <p className="text-xs text-[var(--text-muted)]">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                             </div>
                             <p className="text-sm font-bold text-[var(--text-main)]">{formatCurrency(t.amount)}</p>
                          </div>
                        ))
                      )}
                   </div>
                 </div>

                 {/* Right side: Categories Raio-X */}
                 <div>
                    <h4 className="text-[var(--text-main)] font-semibold mb-4">Raio-X da Fatura</h4>
                    {catData.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)] pb-10">Nada a analisar.</div>
                    ) : (
                      <div className="space-y-4">
                        {catData.map((cat, idx) => {
                          const w = Math.max(5, (cat.value / invoiceTotal) * 100);
                          const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-emerald-600', 'bg-cyan-500', 'bg-amber-500', 'bg-blue-500'];
                          const c = colors[idx % colors.length];
                          
                          return (
                            <div key={cat.name}>
                              <div className="flex justify-between text-xs font-semibold mb-1 text-[var(--text-main)]">
                                <span className="uppercase">{cat.name}</span>
                                <span>{w.toFixed(0)}% • {formatCurrency(cat.value)}</span>
                              </div>
                              <div className="w-full bg-[var(--background)] h-2 rounded-full overflow-hidden border border-[var(--card-border)]">
                                <div className={`h-full rounded-full ${c}`} style={{width: `${w}%`}}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                 </div>

              </div>
            </div>
          );
        })}
        {cards.length === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)] bg-[var(--card)] rounded-3xl border border-dashed border-[var(--card-border)]">
             Ainda não há cartões. Adicione seu primeiro clicando em "Ver Novo Cartão".
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--text-main)]">Registrar Cartão</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-[var(--text-main)]">
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2 text-zinc-400">Nome do Cartão (ou Banco)</label>
                 <input autoFocus required type="text" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none"/>
               </div>
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2 text-zinc-400">Limite Total (R$)</label>
                 <input required type="number" step="0.01" value={newCard.limit} onChange={e => setNewCard({...newCard, limit: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none"/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2 text-zinc-400">Dia Fechamento</label>
                   <input required type="number" min="1" max="31" value={newCard.closingDay} onChange={e => setNewCard({...newCard, closingDay: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none"/>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2 text-zinc-400">Dia Vencimento</label>
                   <input required type="number" min="1" max="31" value={newCard.dueDay} onChange={e => setNewCard({...newCard, dueDay: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none"/>
                 </div>
               </div>
               <button type="submit" className="w-full h-12 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-medium">Cadastrar Cartão</button>
            </form>
          </div>
        </div>
      )}

    </NavigationShell>
  );
}
