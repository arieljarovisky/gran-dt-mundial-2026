import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_dismissed') === '1');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa_dismissed', '1');
    setDismissed(true);
    setDeferred(null);
  };

  const show = !isStandalone && !dismissed && deferred;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 safe-bottom"
        >
          <div className="glass-gold rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-sm shrink-0">
              DT
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Instalá Gran DT 26</p>
              <p className="text-xs text-gray-400 mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
              <button onClick={install} className="btn-primary mt-3 w-full py-2 text-sm flex items-center justify-center gap-2">
                <Download size={16} /> Instalar app
              </button>
            </div>
            <button onClick={dismiss} className="p-1 text-gray-500 hover:text-white shrink-0">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
