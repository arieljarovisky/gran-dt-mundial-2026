import { ReactNode, useState } from 'react';
import { Users, Shirt, RefreshCw, LogOut, Pencil, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney } from '../utils';

type Tab = 'team' | 'tournaments';

interface AppShellProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  budget?: number;
  canEditSquad?: boolean;
  onReset?: () => void;
  teamName?: string;
  email?: string;
  onUpdateTeamName?: (name: string) => Promise<void>;
  onLogout?: () => void;
  children: ReactNode;
}

const NAV = [
  { id: 'team' as const, label: 'Equipo', icon: Shirt },
  { id: 'tournaments' as const, label: 'Torneos', icon: Users },
];

export default function AppShell({
  tab,
  onTabChange,
  budget,
  canEditSquad,
  onReset,
  teamName,
  email,
  onUpdateTeamName,
  onLogout,
  children,
}: AppShellProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(teamName || '');
  const [savingName, setSavingName] = useState(false);

  const startEdit = () => {
    setNameDraft(teamName || '');
    setEditingName(true);
  };

  const saveName = async () => {
    if (!onUpdateTeamName || nameDraft.trim().length < 2) return;
    setSavingName(true);
    try {
      await onUpdateTeamName(nameDraft.trim());
      setEditingName(false);
    } catch {
      alert('No se pudo actualizar el nombre del equipo.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      <header className="glass sticky top-0 z-40 safe-top">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-sm shadow-lg shadow-amber-500/20 shrink-0">
              DT
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-extrabold text-white tracking-tight leading-none truncate">
                Gran DT <span className="text-gradient-gold">26</span>
              </h1>
              {teamName && onUpdateTeamName && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-[10px] text-amber-400/90 truncate max-w-[140px] sm:max-w-none hover:text-amber-300 text-left"
                >
                  {teamName}
                </button>
              )}
              {teamName && !onUpdateTeamName && (
                <p className="text-[10px] text-amber-400/90 truncate">{teamName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {tab === 'team' && budget !== undefined && (
              <div className="flex items-center gap-2 mr-1">
                <div className="text-right">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest leading-none">Presupuesto</div>
                  <div className="text-sm md:text-base font-mono font-bold text-gradient-gold leading-tight">
                    {formatMoney(budget)}
                  </div>
                </div>
                {onReset && (
                  <button
                    onClick={onReset}
                    disabled={!canEditSquad}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                    aria-label="Reiniciar equipo"
                  >
                    <RefreshCw size={15} className="text-gray-400" />
                  </button>
                )}
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-95 transition-all"
                aria-label="Cerrar sesión"
                title={email}
              >
                <LogOut size={15} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <nav className="hidden md:flex max-w-2xl lg:max-w-5xl mx-auto px-4 gap-1 pb-3">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-6 pb-24 md:pb-8">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/5 safe-bottom">
        <div className="flex max-w-2xl mx-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 relative"
            >
              {tab === id && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-x-3 inset-y-1.5 bg-amber-500/12 rounded-2xl border border-amber-500/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={`relative z-10 transition-colors ${tab === id ? 'text-amber-400' : 'text-gray-500'}`}
              />
              <span
                className={`relative z-10 text-[10px] font-semibold transition-colors ${
                  tab === id ? 'text-amber-400' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {editingName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            onClick={() => setEditingName(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="glass-gold rounded-2xl p-5 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Pencil size={16} className="text-amber-400" /> Nombre del equipo
                </h3>
                <button onClick={() => setEditingName(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <input
                className="input-field mb-4"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={80}
                autoFocus
              />
              <button
                onClick={saveName}
                disabled={savingName || nameDraft.trim().length < 2}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check size={16} /> {savingName ? 'Guardando...' : 'Guardar'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {onUpdateTeamName && !editingName && (
        <button
          onClick={startEdit}
          className="fixed bottom-24 md:bottom-6 right-4 z-30 w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg md:hidden"
          aria-label="Editar nombre del equipo"
        >
          <Pencil size={18} className="text-amber-400" />
        </button>
      )}
    </div>
  );
}
