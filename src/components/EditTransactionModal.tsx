"use client";

import React, { useState, useEffect } from "react";
import { X, CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onSuccess: () => void;
}

export default function EditTransactionModal({ isOpen, onClose, transaction, onSuccess }: EditModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [installments, setInstallments] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(Math.abs(transaction.amount).toString());
      setDescription(transaction.description || "");
      setDate(transaction.date || "");
      setCategory(transaction.category || "");
      setInstallments(transaction.installments?.toString() || "1");
    }
  }, [transaction]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
    setIsSaving(true);
    
    const totalAmount = Number(amount.replace(',', '.'));
    
    // Verifica se a transação atual originalmente é uma parcela (ex: "Compra Legal (1/3)")
    const parcelMatch = transaction.description?.match(/^(.*)\s+\((\d+)\/(\d+)\)$/);
    
    if (parcelMatch) {
      const baseName = parcelMatch[1].trim(); // "Compra Legal"
      const totalInstallments = parcelMatch[3]; // "3"

      // Busca candidatos usando apenas o prefixo seguro para evitar bugs de caracteres especiais no ILIKE do Postgres
      const { data: candidates } = await supabase
        .from('transactions')
        .select('*')
        .ilike('description', `${baseName}%`)
        .eq('type', transaction.type);

      // Filtra na memória (JS) usando a Regex impenetrável
      const siblings = candidates?.filter(c => {
         const match = c.description.match(new RegExp(`^.*\\s+\\(\\d+\\/${totalInstallments}\\)$`));
         return match && c.description.startsWith(baseName);
      }) || [];

      if (siblings.length > 0) {
        // Verifica se o usuário renomeou a base no input (ex: alterou "Compra Legal (1/3)" para "Viagem Paris (1/3)")
        const newDescMatch = description.match(/^(.*)\s+\(\d+\/\d+\)$/);
        const newBaseName = newDescMatch ? newDescMatch[1].trim() : null;
        const isChangingBaseName = newBaseName && newBaseName !== baseName;

        for (const sib of siblings) {
          const updates: any = { category };
          
          if (transaction.amount !== totalAmount) {
            updates.amount = totalAmount; // Replica o novo valor para todas as parcelas
          }

          if (isChangingBaseName) {
            const curPortion = sib.description.match(/\(\d+\/\d+\)$/);
            if (curPortion) {
              updates.description = `${newBaseName} ${curPortion[0]}`;
            }
          } else if (sib.id === transaction.id) {
             // Atualiza descrição normal se for apenas para essa (caso o regex não seja alterado mas ele fez um typo fixo nela)
             updates.description = description;
             updates.date = date; // Aplica alteração de data APENAS na parcela que ele abriu
          }

          await supabase.from('transactions').update(updates).eq('id', sib.id);
        }
      } else {
         // Fallback se n achar ngm
         await supabase.from('transactions').update({ description, amount: totalAmount, date, category, installments: Number(installments) }).eq('id', transaction.id);
      }
    } else {
      // Transação normal, sem parcelas
      await supabase.from('transactions').update({
        description,
        amount: totalAmount,
        date,
        category,
        installments: Number(installments)
      }).eq('id', transaction.id);
    }

    setIsSaving(false);
    onSuccess();
    onClose();
  }

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-[var(--text-main)] tracking-tight">Editar Transação</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-border)] transition-colors"><X size={18} /></button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Novo Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-medium">R$</span>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-14 pl-12 pr-4 text-2xl font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Data</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 pl-10 pr-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Categoria</label>
              <input 
                list="edit-category-suggestions"
                type="text" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all" 
                required 
              />
              <datalist id="edit-category-suggestions">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Descrição</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Parcelas</label>
              <input type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all" required />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full h-12 bg-emerald-600 focus:outline-none disabled:bg-emerald-900 disabled:cursor-not-allowed hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] mt-2 flex items-center justify-center gap-2">
            {isSaving ? <><Loader2 size={18} className="animate-spin" /> Atualizando...</> : "Salvar Alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}
