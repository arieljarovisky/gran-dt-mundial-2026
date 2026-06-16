import { useState, useEffect } from 'react';
import { Player, Position } from '../types';
import { fetchPlayers } from '../api/client';
import { formatMoney } from '../utils';
import { X, Search } from 'lucide-react';
import { motion } from 'motion/react';
import FlagImage from './FlagImage';

interface MarketProps {
  onClose: () => void;
  targetPosition?: Position;
  onSelectPlayer: (player: Player) => void;
  currentBudget: number;
}

const POSITIONS: Position[] = ['POR', 'DEF', 'MED', 'DEL'];

const POS_LABEL: Record<Position, string> = {
  POR: 'Porteros',
  DEF: 'Defensores',
  MED: 'Mediocampistas',
  DEL: 'Delanteros',
};

export default function Market({ onClose, targetPosition, onSelectPlayer, currentBudget }: MarketProps) {
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>(targetPosition || 'ALL');
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchPlayers({
          position: filterPos === 'ALL' ? undefined : filterPos,
          search: search || undefined,
        });
        if (!cancelled) setPlayers(data);
      } catch {
        if (!cancelled) setPlayers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(load, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterPos, search]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative flex flex-col w-full md:max-w-lg md:rounded-3xl glass mt-auto md:mt-0 h-[92dvh] md:h-[85dvh] safe-bottom overflow-hidden shadow-2xl"
      >
        {/* Handle bar mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-4 pt-2 pb-3 flex items-start justify-between gap-3 border-b border-white/5">
          <div>
            <h2 className="text-lg font-extrabold text-white">Mercado de Pases</h2>
            {targetPosition && (
              <p className="text-xs text-amber-500/80 font-semibold mt-0.5">{POS_LABEL[targetPosition]}</p>
            )}
            <p className="text-sm font-mono text-gradient-gold font-bold mt-1">
              {formatMoney(currentBudget)} disponible
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Search + filters */}
        <div className="px-4 py-3 space-y-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
            <input
              type="search"
              placeholder="Buscar jugador o país..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
            {(['ALL', ...POSITIONS] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setFilterPos(pos)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all shrink-0 ${
                  filterPos === pos
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                    : 'bg-white/5 text-gray-400 border border-white/8'
                }`}
              >
                {pos === 'ALL' ? 'Todos' : pos}
              </button>
            ))}
          </div>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 hide-scrollbar">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))
          ) : players.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No se encontraron jugadores</div>
          ) : (
            players.map((player, i) => {
              const canAfford = currentBudget >= player.price;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-white/6 hover:bg-white/7 active:scale-[0.99] transition-all"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0 flex items-center justify-center">
                    <FlagImage
                      flag={player.flag}
                      teamCode={player.teamCode}
                      className="w-full h-full object-cover"
                      fallbackClassName="text-xs"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{player.shirtName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {player.country} · <span className="text-gray-400 font-semibold">{player.position}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-mono font-bold text-amber-400">{formatMoney(player.price)}</span>
                    <button
                      onClick={() => onSelectPlayer(player)}
                      disabled={!canAfford}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                        canAfford
                          ? 'btn-primary py-1 px-3 text-[10px] shadow-none'
                          : 'bg-white/5 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Fichar
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
