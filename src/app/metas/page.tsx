"use client";

import React, { useState, useEffect } from "react";
import NavigationShell from "../../components/NavigationShell";
import { supabase } from "../../lib/supabaseClient";
import { Target, Plus, Search, TrendingUp, X, Trash2, PiggyBank, Plane, Home, Car, GraduationCap, Laptop, Users } from "lucide-react";

export default function Metas() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  
  // New Goal Form
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("piggy");
  const [sharedEmail, setSharedEmail] = useState("");
  
  // Add Money Form
  const [addAmount, setAddAmount] = useState("");

  const icons = [
    { id: 'piggy', component: <PiggyBank size={24} /> },
    { id: 'plane', component: <Plane size={24} /> },
    { id: 'home', component: <Home size={24} /> },
    { id: 'car', component: <Car size={24} /> },
    { id: 'education', component: <GraduationCap size={24} /> },
    { id: 'tech', component: <Laptop size={24} /> },
  ];

  async function fetchGoals() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) setCurrentUserEmail(session.user.email);

    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    if (data) setGoals(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const colors: Record<string, string> = {
      piggy: "from-pink-500 to-rose-600",
      plane: "from-sky-500 to-blue-600",
      home: "from-emerald-500 to-teal-600",
      car: "from-zinc-500 to-stone-700",
      education: "from-emerald-600 to-teal-800",
      tech: "from-amber-400 to-orange-500"
    };

    const newGoalPayload: any = {
      user_id: user?.id,
      name,
      target_amount: Number(targetAmount),
      current_amount: 0,
      deadline,
      icon: selectedIcon,
      color: colors[selectedIcon] || colors.piggy
    };

    // If there's an email for a partner, save it.
    if (sharedEmail.trim()) {
       newGoalPayload.shared_with_email = sharedEmail.trim();
    }

    const { error } = await supabase.from('goals').insert([newGoalPayload]);

    if (!error) {
       setShowGoalModal(false);
       setName("");
       setTargetAmount("");
       setDeadline("");
       setSelectedIcon("piggy");
       setSharedEmail("");
       fetchGoals();
    } else {
       alert("Erro ao criar meta: " + error.message);
    }
  };

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    
    const amount = Number(addAmount);
    const newTotal = Number(selectedGoal.current_amount) + amount;
    
    const { error: errorGoal } = await supabase.from('goals').update({ current_amount: newTotal }).eq('id', selectedGoal.id);
    
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('transactions').insert([{
      user_id: user?.id,
      description: `Investimento: ${selectedGoal.name}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: 'Investimento'
    }]);

    if (!errorGoal) {
       setShowAddMoneyModal(false);
       setAddAmount("");
       fetchGoals();
    } else {
       alert("Erro ao adicionar valor: " + errorGoal.message);
    }
  };

  const deleteGoal = async (id: string, e: any) => {
    e.stopPropagation();
    if (window.confirm("Certeza que deseja excluir esta meta? O dinheiro investido nela apenas será apagado deste visor.")) {
      await supabase.from('goals').delete().eq('id', id);
      fetchGoals();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const renderIcon = (id: string) => {
    return icons.find(i => i.id === id)?.component || <Target size={24} />;
  };

  if (loading) return <NavigationShell title="Minhas Metas"><div className="p-8 text-[var(--text-muted)] animate-pulse">Carregando seus sonhos...</div></NavigationShell>;

  return (
    <NavigationShell title="Minhas Metas">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">Cofres e Sonhos</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">O seu dinheiro trabalhando pelos seus objetivos.</p>
        </div>
        <button 
          onClick={() => setShowGoalModal(true)}
          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-full flex items-center gap-2 transition-all shadow-md"
        >
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
        {goals.map(goal => {
          const percent = Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100);
          const isCompleted = percent >= 100;
          const isShared = !!goal.shared_with_email;
          
          return (
            <div key={goal.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 shadow-sm flex flex-col relative overflow-hidden group transition-all hover:border-[var(--accent)]/50">
               {isCompleted && (
                 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full"></div>
               )}

               <div className="flex justify-between items-start mb-6 relative z-10">
                 <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${goal.color} text-white shadow-lg flex items-center justify-center`}>
                    {renderIcon(goal.icon)}
                 </div>
                 <div className="flex items-center gap-2">
                   {isShared && (
                     <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] uppercase font-bold flex items-center gap-1" title={`Compartilhado com: ${goal.shared_with_email}`}>
                        <Users size={12} /> Casal
                     </div>
                   )}
                   <button onClick={(e) => deleteGoal(goal.id, e)} className="text-[var(--text-muted)] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                 </div>
               </div>
               
               <div className="relative z-10 flex-1">
                 <h3 className="font-bold text-lg text-[var(--text-main)] mb-1">{goal.name}</h3>
                 <p className="text-xs text-[var(--text-muted)] mb-4">Meta para: {new Date(goal.deadline).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                 
                 <div className="flex justify-between items-end mb-2">
                   <span className="text-2xl font-bold text-[var(--text-main)] tracking-tight">{formatCurrency(goal.current_amount)}</span>
                   <span className="text-sm font-medium text-[var(--text-muted)]">de {formatCurrency(goal.target_amount)}</span>
                 </div>
                 
                 <div className="w-full bg-[var(--background)] h-2 rounded-full overflow-hidden mb-2 border border-[var(--card-border)]">
                   <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r ' + goal.color}`} style={{ width: `${percent}%` }}></div>
                 </div>
                 <p className="text-right text-xs font-semibold text-[var(--text-muted)]">{percent.toFixed(1)}% alcançado</p>
               </div>

               <div className="mt-6 pt-4 border-t border-[var(--card-border)] relative z-10">
                  <button 
                    onClick={() => {
                       setSelectedGoal(goal);
                       setShowAddMoneyModal(true);
                    }}
                    disabled={isCompleted}
                    className={`w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                       isCompleted 
                       ? 'bg-emerald-500/10 text-emerald-500 cursor-not-allowed' 
                       : 'bg-[var(--background)] border border-[var(--card-border)] text-[var(--text-main)] hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/50 hover:text-[var(--accent)]'
                    }`}
                  >
                     {isCompleted ? 'Meta Concluída 🎉' : <><TrendingUp size={16}/> Guardar Dinheiro</>}
                  </button>
               </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-20 px-4 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--card-border)]">
             <Target size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
             <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">Qual o seu próximo sonho?</h3>
             <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-6">Comece sua primeira meta, como "Reserva de Emergência", "Viagem para Europa" ou "Carro Novo". Todo império começa com o primeiro tijolo.</p>
             <button onClick={() => setShowGoalModal(true)} className="px-6 h-12 bg-emerald-600 text-white font-medium rounded-full shadow-lg hover:bg-emerald-500 transition-colors mx-auto inline-flex items-center gap-2"><Plus size={18}/> Definir Primeira Meta</button>
          </div>
        )}
      </div>

      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGoalModal(false)}></div>
          <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--text-main)] tracking-tight">Novo Sonho/Meta</h2>
              <button onClick={() => setShowGoalModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateGoal} className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Nome da Meta</label>
                 <input autoFocus required type="text" placeholder="Ex: Viagem Disney" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
               </div>
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Valor Total a Juntar (R$)</label>
                 <input required type="number" step="0.01" placeholder="Ex: 5000" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
               </div>
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Compartilhar com (Opcional)</label>
                 <input type="email" placeholder="E-mail da sua parceira(o)" value={sharedEmail} onChange={e => setSharedEmail(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                 <p className="text-[10px] text-[var(--text-muted)] mt-1">Coloque o e-mail dela aqui para vocês encherem este cofre juntos.</p>
               </div>
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Data Alvo</label>
                 <input required type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
               </div>
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2 mt-4">Escolha um Ícone</label>
                 <div className="grid grid-cols-6 gap-2">
                    {icons.map(icon => (
                       <div 
                         key={icon.id}
                         onClick={() => setSelectedIcon(icon.id)}
                         className={`h-12 flex items-center justify-center rounded-xl cursor-pointer transition-all border ${selectedIcon === icon.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-[var(--background)] border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}
                       >
                          {icon.component}
                       </div>
                    ))}
                 </div>
               </div>
               <button type="submit" className="w-full h-12 mt-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"><Target size={18} /> Criar Meta</button>
            </form>
          </div>
        </div>
      )}

      {showAddMoneyModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddMoneyModal(false)}></div>
          <div className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-main)] tracking-tight">Guardar Dinheiro</h2>
              <button onClick={() => setShowAddMoneyModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={18} /></button>
            </div>
            
            <div className="text-center mb-6">
               <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Enviando para</p>
               <p className="font-bold text-[var(--text-main)] text-xl">{selectedGoal.name}</p>
            </div>

            <form onSubmit={handleAddMoney} className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Valor da Aplicação (R$)</label>
                 <input autoFocus required type="number" step="0.01" placeholder="Ex: 100" value={addAmount} onChange={e => setAddAmount(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--card-border)] text-center text-xl font-bold rounded-2xl h-16 px-4 text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"/>
               </div>
               
               <button type="submit" className="w-full h-12 mt-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"><TrendingUp size={18}/> Investir Agora!</button>
            </form>
          </div>
        </div>
      )}

    </NavigationShell>
  );
}
