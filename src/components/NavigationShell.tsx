"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import NewTransactionModal from "./NewTransactionModal";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  CalendarDays,
  Bell,
  Plus,
  Sun,
  Moon,
  Target,
  Settings,
  PiggyBank
} from "lucide-react";
import { getInvoicePeriod } from "../lib/invoiceLogic";
import Link from "next/link";

export default function NavigationShell({ children, title }: { children: React.ReactNode, title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationSentRef = React.useRef(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("cofrinho_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cofrinho_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    async function fetchAlerts() {
      const today = new Date();
      today.setHours(0,0,0,0);
      const in5Days = new Date(today);
      in5Days.setDate(in5Days.getDate() + 5);
      
      const todayStr = today.toLocaleDateString('en-CA');
      const in5DaysStr = in5Days.toLocaleDateString('en-CA');

      // Busca TODOS os agendamentos fixos para a janela, e TODOS os créditos não pagos do usuário
      const { data: fixedList } = await supabase.from('transactions').select('*').eq('type', 'fixed').gte('date', todayStr).lte('date', in5DaysStr).eq('user_id', user.id);
      const { data: creditList } = await supabase.from('transactions').select('*').eq('type', 'credit').eq('is_paid', false).eq('user_id', user.id);
      const { data: cCards } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);

      const grouped: any[] = [];
      const cardMap: {[key: string]: any} = {};

      if (fixedList) {
        fixedList.forEach(t => grouped.push(t));
      }

      if (creditList && cCards) {
        creditList.forEach(t => {
          const card = cCards.find(c => c.id === t.credit_card_id);
          if (!card) return;
          
          const { invoiceYear, invoiceMonth } = getInvoicePeriod(t.date, card.closing_day, card.due_day, t.description);
          const computedDueDate = new Date(invoiceYear, invoiceMonth - 1, card.due_day);
          
          // Verifica se o vencimento computado cai nos próximos 5 dias
          if (computedDueDate >= today && computedDueDate <= in5Days) {
            const dueDateStr = computedDueDate.toISOString().split('T')[0];
            const key = `${dueDateStr}_${card.id}`;
            if (!cardMap[key]) {
              cardMap[key] = {
                id: key,
                description: `Fatura ${card.name}`,
                amount: 0,
                date: dueDateStr,
                type: 'credit',
                isGrouped: true
              };
              grouped.push(cardMap[key]);
            }
            cardMap[key].amount += Number(t.amount);
          }
        });
      }

      // Ordenar por data
      grouped.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setNotifications(grouped);
    }
    fetchAlerts();
  }, [user]);

  // WHATSAPP AUTOMATION MOTOR
  useEffect(() => {
    if (!user) return;

    async function checkAndSendWhatsApp() {
      if (notificationSentRef.current) return;
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayStr = today.toLocaleDateString('en-CA');
      
      const { data: st } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
      if (!st || !st.whatsapp_number || !st.whatsapp_apikey || !st.notifications_enabled) return;
      if (st.last_notification_sent === todayStr) return;

      const { data: fixedList } = await supabase.from('transactions').select('*').eq('type', 'fixed').eq('date', todayStr).eq('user_id', user.id);
      const { data: creditList } = await supabase.from('transactions').select('*').eq('type', 'credit').eq('is_paid', false).eq('user_id', user.id);
      const { data: cCards } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);

      const dues: any[] = [];
      if (fixedList) fixedList.forEach(t => dues.push(t));

      if (creditList && cCards) {
        creditList.forEach(t => {
          const card = cCards.find(c => c.id === t.credit_card_id);
          if (!card) return;
          const { invoiceYear, invoiceMonth } = getInvoicePeriod(t.date, card.closing_day, card.due_day, t.description);
          const computedDueDate = new Date(invoiceYear, invoiceMonth - 1, card.due_day);
          
          if (computedDueDate.getTime() === today.getTime()) {
            dues.push(t);
          }
        });
      }

      if (dues.length > 0) {
        // Group by fixed and credit
        const { data: cCards } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
        
        let message = `💰 *Alerta do Cofrinho!* \nHá contas vencendo HOJE que precisam de atenção:\n\n`;
        
        // Items logic
        const cardTotals: {[key: string]: number} = {};
        
        dues.forEach(d => {
          if (d.type === 'fixed') {
            message += `• ${d.description}: *R$ ${Number(d.amount).toFixed(2)}*\n`;
          } else if (d.type === 'credit' && d.credit_card_id) {
            cardTotals[d.credit_card_id] = (cardTotals[d.credit_card_id] || 0) + Number(d.amount);
          }
        });

        Object.entries(cardTotals).forEach(([cardId, total]) => {
          const cardName = cCards?.find(c => c.id === cardId)?.name || "Cartão";
          message += `• Fatura ${cardName}: *R$ ${total.toFixed(2)}*\n`;
        });

        message += `\nAbra o app para confirmar o pagamento! 🐷✨`;

        const encodedMsg = encodeURIComponent(message);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${st.whatsapp_number}&text=${encodedMsg}&apikey=${st.whatsapp_apikey}`;

        try {
          notificationSentRef.current = true;
          await fetch(url, { mode: 'no-cors' });
          await supabase
            .from('user_settings')
            .update({ last_notification_sent: today })
            .eq('user_id', user.id);
        } catch (e) {
          console.error("Erro no WhatsApp Bot:", e);
        }
      }
    }

    checkAndSendWhatsApp();
  }, [user]);

  return (
    <div className={`${theme} flex h-screen w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans selection:bg-emerald-500/30 transition-colors duration-300`}>
      {/* SIDEBAR */}
      <aside className="w-72 border-r border-[var(--card-border)] bg-[var(--sidebar)] hidden md:flex flex-col transition-colors">
        <div className="h-20 flex items-center px-8 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <PiggyBank className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-[var(--text-main)] transition-colors">Cofrinho</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <div className="px-4 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Menu Principal
          </div>
          <NavItem href="/" active={pathname === "/"} icon={<LayoutDashboard size={18} />} label="Dashboard" theme={theme} />
          <NavItem href="/metas" active={pathname === "/metas"} icon={<Target size={18} />} label="Metas e Sonhos" theme={theme} />
          <NavItem href="/transacoes" active={pathname === "/transacoes"} icon={<Wallet size={18} />} label="Transações" theme={theme} />
          <NavItem href="/cartoes" active={pathname === "/cartoes"} icon={<CreditCard size={18} />} label="Cartões de Crédito" theme={theme} />
          <NavItem href="/gastos-fixos" active={pathname === "/gastos-fixos"} icon={<CalendarDays size={18} />} label="Gastos Fixos" theme={theme} />
          <NavItem href="/configuracoes" active={pathname === "/configuracoes"} icon={<Settings size={18} />} label="Configurações" theme={theme} />
        </nav>

        <div className="p-6 border-t border-[var(--card-border)]">
          <div 
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--card-border)]">
              <span className="text-sm font-medium">{user?.email ? user.email.charAt(0).toUpperCase() : 'L'}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate group-hover:text-rose-400 transition-colors text-[var(--text-main)]">{user?.email || "Carregando..."}</p>
              <p className="text-xs text-[var(--text-muted)] truncate group-hover:text-rose-500/80 transition-colors">Sair da Conta</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR */}
        <header className="h-20 border-b border-[var(--card-border)] flex items-center justify-between px-8 bg-[var(--background)]/80 backdrop-blur-md z-10 shrink-0 transition-colors">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--text-main)]">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/50 transition-all text-[var(--text-muted)] hover:text-[var(--accent)]"
              title={theme === "dark" ? "Ativar Modo Luz" : "Ativar Modo Escuro"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--card-border)] hidden md:flex items-center justify-center hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/50 transition-colors"
              >
                <Bell size={18} className="text-[var(--text-muted)]" />
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 w-80 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--background)]/50">
                    <h3 className="font-semibold text-[var(--text-main)] text-sm">Próximos Vencimentos</h3>
                    <span className="bg-rose-500/10 text-rose-500 text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length} alerta{notifications.length !== 1 && 's'}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[var(--text-muted)]">
                        Tudo tranquilo! Nenhuma conta vencendo nos próximos 5 dias. 🎉
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const daysLeft = Math.ceil((new Date(notif.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        const isCredit = notif.type === 'credit';
                        return (
                          <div key={notif.id} className="p-3 mb-1 rounded-xl hover:bg-[var(--background)] transition-colors cursor-pointer border border-transparent flex gap-3 items-start">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                              {isCredit ? <CreditCard size={14} /> : <CalendarDays size={14} />}
                            </div>
                            <div>
                               <p className="text-sm font-medium text-[var(--text-main)] leading-tight">{notif.description}</p>
                               <p className="text-xs text-[var(--text-muted)] mt-1">
                                 {daysLeft === 0 ? <span className="text-rose-400 font-semibold">Vence Hoje!</span> : `Vence em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`} 
                                 <span className="mx-1">•</span> 
                                 <strong className="text-[var(--text-main)]">R$ {Math.abs(notif.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                               </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-full flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova Transação</span>
            </button>
          </div>
        </header>

        {/* SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[var(--card)]/90 backdrop-blur-xl border-t border-[var(--card-border)] z-40 flex items-center justify-between px-2 py-3 pb-safe">
          <MobileNavItem href="/" active={pathname === "/"} icon={<LayoutDashboard size={20} />} label="Início" />
          <MobileNavItem href="/transacoes" active={pathname === "/transacoes"} icon={<Wallet size={20} />} label="Extrato" />
          
          <div className="relative -top-6">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-14 w-14 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(16,185,129,0.5)] border-4 border-[var(--card)] transform active:scale-90 transition-transform"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>
          
          <MobileNavItem href="/metas" active={pathname === "/metas"} icon={<Target size={20} />} label="Metas" />
          <MobileNavItem href="/configuracoes" active={pathname === "/configuracoes"} icon={<Settings size={20} />} label="Ajustes" />
        </nav>
      </main>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function NavItem({ active, icon, label, href, theme }: { active?: boolean; icon: React.ReactNode; label: string; href: string, theme: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? "bg-emerald-500/10 text-emerald-500 font-semibold" 
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card)]"
      }`}
    >
      <div className={`${active ? "text-emerald-500" : "text-[var(--text-muted)]"}`}>{icon}</div>
      <span className="text-sm">{label}</span>
    </Link>
  );
}

function MobileNavItem({ active, icon, label, href }: { active?: boolean; icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center w-16 gap-1 transition-all ${
        active 
          ? "text-emerald-500" 
          : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
      }`}
    >
      <div className={`${active ? "text-emerald-500" : "text-[var(--text-muted)]"}`}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
