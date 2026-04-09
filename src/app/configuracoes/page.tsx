"use client";

import React, { useState, useEffect } from "react";
import NavigationShell from "../../components/NavigationShell";
import { supabase } from "../../lib/supabaseClient";
import { Settings, Save, Bell, BellOff, MessageSquare, ShieldCheck, Loader2 } from "lucide-react";

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    whatsapp_number: "",
    whatsapp_apikey: "",
    notifications_enabled: true
  });

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setSettings({
          whatsapp_number: data.whatsapp_number || "",
          whatsapp_apikey: data.whatsapp_apikey || "",
          notifications_enabled: data.notifications_enabled ?? true
        });
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          whatsapp_number: settings.whatsapp_number,
          whatsapp_apikey: settings.whatsapp_apikey,
          notifications_enabled: settings.notifications_enabled,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        alert("Configurações salvas com sucesso! O Robô do Cofrinho já está monitorando suas contas.");
      } else {
        alert("Erro ao salvar: " + error.message);
      }
    }
    setSaving(false);
  }

  async function handleTestAutomation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !settings.whatsapp_number || !settings.whatsapp_apikey) {
      alert("Por favor, preencha o número e a apikey antes de testar!");
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: dues } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', today)
      .or('type.eq.fixed,type.eq.credit');

    if (dues && dues.length > 0) {
      let message = `💰 *Teste de Alerta do Cofrinho!* \nHá contas vencendo HOJE:\n\n`;
      dues.forEach(d => {
        message += `• ${d.description}: *R$ ${Number(d.amount).toFixed(2)}*\n`;
      });
      message += `\nConexão OK! 🐷✨`;

      const encodedMsg = encodeURIComponent(message);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${settings.whatsapp_number}&text=${encodedMsg}&apikey=${settings.whatsapp_apikey}`;

      try {
        await fetch(url, { mode: 'no-cors' });
        alert("Mensagem de teste enviada para o seu WhatsApp! Verifique seu celular.");
      } catch (e) {
        alert("Erro ao enviar: verifique se o número e a apikey estão corretos.");
      }
    } else {
      alert("Não há contas vencendo HOJE para enviar um resumo de teste. Cadastre uma despesa para hoje primeiro!");
    }
  }

  if (loading) return <NavigationShell title="Configurações"><div className="p-8 text-[var(--text-muted)] animate-pulse text-center">Carregando preferências...</div></NavigationShell>;

  return (
    <NavigationShell title="Configurações">
      <div className="max-w-2xl mx-auto pb-24">
        <div className="mb-8 flex justify-between items-start">
           <div>
              <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Personalize seu Cofrinho</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Ajuste como o sistema deve cuidar do seu dinheiro e te avisar.</p>
           </div>
           <button 
             onClick={handleTestAutomation}
             className="h-10 px-4 bg-[var(--card)] border border-[var(--card-border)] rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all flex items-center gap-2"
           >
             <MessageSquare size={14} className="text-emerald-500" /> Testar Robô Agora
           </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* WHATSAPP CARD */}
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                 <MessageSquare size={20} />
               </div>
               <div>
                  <h3 className="font-bold text-[var(--text-main)]">O Robô do Zap (CallMeBot)</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Alertas automáticos de vencimento via WhatsApp.</p>
               </div>
            </div>

            <div className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Seu Número de WhatsApp</label>
                 <input 
                   required 
                   type="text" 
                   placeholder="Ex: 551999999999" 
                   value={settings.whatsapp_number} 
                   onChange={e => setSettings({...settings, whatsapp_number: e.target.value})} 
                   className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none transition-all"
                 />
                 <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-1">Coloque o código do país + DDD + Número (apenas números).</p>
               </div>

               <div>
                 <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider mb-2">Sua Apikey do CallMeBot</label>
                 <input 
                   required 
                   type="password" 
                   placeholder="Cole sua apikey aqui" 
                   value={settings.whatsapp_apikey} 
                   onChange={e => setSettings({...settings, whatsapp_apikey: e.target.value})} 
                   className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl h-12 px-4 text-sm text-[var(--text-main)] focus:border-emerald-500/50 focus:outline-none transition-all"
                 />
               </div>

               <div className="pt-4 flex items-center justify-between">
                 <div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">Ativar Notificações do Robô</p>
                    <p className="text-xs text-[var(--text-muted)]">O sistema te avisará no dia do vencimento.</p>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setSettings({...settings, notifications_enabled: !settings.notifications_enabled})}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.notifications_enabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                 >
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notifications_enabled ? 'right-1' : 'left-1'}`}></div>
                 </button>
               </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex gap-3">
             <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
             <p className="text-xs text-emerald-300 leading-relaxed">Suas chaves e números são armazenados de forma criptografada no nosso banco de dados da nuvem. O Cofrinho nunca envia spam, apenas alertas reais que salvam seu bolso.</p>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-bold shadow-lg flex items-center justify-center gap-2 group"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} className="group-hover:scale-110 transition-transform" /> Salvar Configurações</>}
          </button>

        </form>
      </div>
    </NavigationShell>
  );
}
