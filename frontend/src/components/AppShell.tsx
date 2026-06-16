import { ReactNode } from 'react';
import { Users, Shirt, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney } from '../utils';

type Tab = 'team' | 'tournaments';

interface AppShellProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  budget?: number;
  canEditSquad?: boolean;
  onReset?: () => void;
  children: ReactNode;
}

const NAV = [
  { id: 'team' as const, label: 'Equipo', icon: Shirt },
  { id: 'tournaments' as const, label: 'Torneos', icon: Users },
];

export default function AppShell({ tab, onTabChange, budget, canEditSquad, onReset, children }: AppShellProps) {
  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Header */}
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
              <p className="text-[10px] text-gray-500 hidden sm:block">Mundial 2026 · Fantasy</p>
            </div>
          </div>

          {tab === 'team' && budget !== undefined && (
            <div className="flex items-center gap-2 shrink-0">
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
        </div>

        {/* Desktop tabs */}
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

      {/* Content */}
      <main className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
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
    </div>
  );
}
