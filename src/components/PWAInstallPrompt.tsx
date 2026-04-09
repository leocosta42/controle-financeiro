"use client";

import React, { useState, useEffect } from "react";
import { Share, PlusSquare, X, PiggyBank, ArrowDown } from "lucide-react";

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detect if it is iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    
    // 2. Detect if it is NOT in standalone mode (not installed yet)
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    // 3. Handle Chrome/Android "beforeinstallprompt"
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Force show for iOS if not installed
    if (ios && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-[100] animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-[var(--card)] border border-emerald-500/30 rounded-3xl p-5 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <PiggyBank className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[var(--text-main)] font-bold text-lg leading-tight">Cofrinho no Celular?</h3>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {isIOS 
                ? "Instale o Cofrinho como um Aplicativo nativo para acesso rápido e seguro."
                : "Transforme sua gestão financeira em um App com apenas um clique!"}
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest text-center">Como Instalar no Safari:</p>
            
            <div className="flex items-center justify-between gap-2 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-4">
              <div className="flex flex-col items-center gap-2 flex-1 text-center">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Share size={18} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase">Clique no "Compartilhar"</span>
              </div>

              <div className="text-emerald-500 animate-pulse">
                 <ArrowDown size={16} className="-rotate-90" />
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 text-center">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <PlusSquare size={18} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase">"Adicionar à Tela de Início"</span>
              </div>
            </div>

            <button 
              onClick={() => setShowPrompt(false)}
              className="w-full h-12 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm"
            >
              Entendi, vou instalar!
            </button>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="w-full h-12 mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <PlusSquare size={18} /> Instalar Agora
          </button>
        )}
      </div>
    </div>
  );
}
