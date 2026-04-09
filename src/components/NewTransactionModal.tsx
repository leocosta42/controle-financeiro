"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowDownRight, ArrowUpRight, CreditCard, CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTransactionModal({ isOpen, onClose }: ModalProps) {
  const [type, setType] = useState<"income" | "expense" | "credit" | "fixed">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [installments, setInstallments] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [startInNextBill, setStartInNextBill] = useState(false);
  const [amountType, setAmountType] = useState<"total" | "installment">("total");

  useEffect(() => {
    async function fetchCards() {
      const { data } = await supabase.from('credit_cards').select('*');
      if (data && data.length > 0) {
        setCards(data);
        setSelectedCardId(data[0].id);
      }
    }
    fetchCards();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const totalAmount = Number(amount.replace(',', '.'));
    const instCount = Number(installments);
    
    let rowsToInsert = [];

    if (type === 'credit') {
      const cCard = cards.find(c => c.id === selectedCardId);
      if (!cCard) {
        alert("Cadastre um cartão na tela de 'Cartões de Crédito' primeiro!");
        setIsSaving(false);
        return;
      }

      let baseInstallment = totalAmount; 
      let remainder = 0;

      if (amountType === 'total') {
        baseInstallment = Math.floor((totalAmount / instCount) * 100) / 100;
        remainder = Number((totalAmount - (baseInstallment * instCount)).toFixed(2));
      }
      
      const originalDateStr = date;
      
      let nextBillTag = startInNextBill ? " [NEXT]" : "";
      
      for (let i = 0; i < instCount; i++) {
        const actualInstallment = i === 0 ? baseInstallment + remainder : baseInstallment;

        // Todas as parcelas terão EXATAMENTE a mesma data física da base de dados.
        // O motor de faturas vai ler a descrição `(i/instCount)` para saber qual mês de destino ela cai!
        const finalDesc = instCount > 1 
          ? `${description} (${i + 1}/${instCount})${nextBillTag}` 
          : `${description}${nextBillTag}`;

        rowsToInsert.push({
          description: finalDesc,
          amount: actualInstallment,
          date: originalDateStr,
          type: type,
          category: category || 'cartão',
          installments: instCount,
          credit_card_id: cCard.id,
          user_id: user?.id
        });
      }
    } else if (type === 'fixed') {
      // Gastos Fixos - Insere para os próximos 12 meses
      for (let i = 0; i < 12; i++) {
        const nextDate = new Date(date + 'T12:00:00');
        nextDate.setMonth(nextDate.getMonth() + i);
        
        rowsToInsert.push({
          description: description,
          amount: totalAmount,
          date: nextDate.toISOString().split('T')[0],
          type: type, // 'fixed'
          category: category || 'gasto fixo',
          installments: 1, // Não é parcelado, é recorrente inteiro
          user_id: user?.id
        });
      }
    } else {
      // Entradas e Saídas Comuns à vista
      rowsToInsert.push({
        description,
        amount: totalAmount,
        date: date,
        type: type,
        category: category || 'outro',
        installments: instCount,
        user_id: user?.id
      });
    }
    
    const { error } = await supabase.from('transactions').insert(rowsToInsert);

    setIsSaving(false);
    if (!error) {
      window.location.reload(); // Quick refresh to see new data
      onClose();
    } else {
      alert("Erro ao salvar: " + error.message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-[var(--text-main)] tracking-tight">Nova Transação</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-border)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Type Selector (Radio Tabs) */}
          <div className="flex bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                type === "expense" 
                  ? "bg-[var(--card)] shadow-sm text-rose-400 border border-[var(--card-border)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <ArrowDownRight size={16} /> Saída
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                type === "income" 
                  ? "bg-[var(--card)] shadow-sm text-emerald-400 border border-[var(--card-border)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <ArrowUpRight size={16} /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setType("credit")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                type === "credit" 
                  ? "bg-[var(--card)] shadow-sm text-emerald-400 border border-[var(--card-border)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <CreditCard size={14} /> Cartão
            </button>
            <button
              type="button"
              onClick={() => setType("fixed")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                type === "fixed" 
                  ? "bg-[var(--card)] shadow-sm text-amber-400 border border-[var(--card-border)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <CalendarDays size={14} /> Fixo
            </button>
          </div>

          {/* Amount Type Switch (Credit Only) */}
          {type === "credit" && (
            <div className="flex bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setAmountType("total")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  amountType === "total" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "text-[var(--text-muted)] hover:text-emerald-400"
                }`}
              >
                Informar Valor Total
              </button>
              <button
                type="button"
                onClick={() => setAmountType("installment")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  amountType === "installment" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "text-[var(--text-muted)] hover:text-emerald-400"
                }`}
              >
                Informar Valor da Parcela
              </button>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-medium">R$</span>
              <input 
                type="number" 
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-14 pl-12 pr-4 text-2xl font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Data
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 pl-10 pr-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Categoria
              </label>
              <input 
                list="category-suggestions"
                placeholder="Selecione ou digite..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                required
              />
              <datalist id="category-suggestions">
                <option value="Alimentação" />
                <option value="Moradia / Aluguel" />
                <option value="Transporte" />
                <option value="Saúde" />
                <option value="Lazer / Viagens" />
                <option value="Educação" />
                <option value="Salário" />
                <option value="Investimentos" />
                <option value="Presentes" />
                <option value="Mercado" />
                <option value="Farmácia" />
                <option value="Pet" />
                <option value="Assinaturas / Streaming" />
              </datalist>
            </div>

            {type === "credit" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Qual Cartão?
                  </label>
                  {cards.length === 0 ? (
                    <p className="text-xs text-rose-400 mt-2">Nenhum cartão cadastrado. Vá na aba Cartões.</p>
                  ) : (
                    <select 
                      value={selectedCardId}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 appearance-none"
                    >
                      {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Parcelas
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Ex: 5"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    required
                  />
                </div>
              </>
            )}
          </div>



          {/* Retroactive bill adjustment checkbox */}
          {type === "credit" && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl">
              <input 
                type="checkbox" 
                id="adjust-to-current"
                checked={startInNextBill}
                onChange={(e) => setStartInNextBill(e.target.checked)}
                className="w-5 h-5 rounded-md border border-[var(--card-border)] accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="adjust-to-current" className="text-sm text-[var(--text-main)] font-medium cursor-pointer select-none">
                Lançar a partir da primeira fatura aberta (fatura atual)
              </label>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Descrição
            </label>
            <input 
              type="text" 
              placeholder="Ex: Almoço no shopping"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-emerald-600 focus:outline-none disabled:bg-emerald-900 disabled:cursor-not-allowed hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] mt-2 flex items-center justify-center gap-2"
          >
            {isSaving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : "Adicionar Lançamento"}
          </button>
        </form>

      </div>
    </div>
  );
}
