import { useState, useEffect } from 'react';
import { Player, Position } from '../types';
import { fetchPlayers } from '../api/client';
import { formatMoney } from '../utils';
import { X, Search } from 'lucide-react';

interface MarketProps {
  onClose: () => void;
  targetPosition?: Position;
  onSelectPlayer: (player: Player) => void;
  currentBudget: number;
}

const POSITIONS: Position[] = ['POR', 'DEF', 'MED', 'DEL'];

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/10">
        <div className="bg-[#121212] p-4 flex justify-between items-center border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Mercado de Pases</h2>
            <p className="text-amber-500 text-sm font-mono tracking-tight mt-1">
              Presupuesto: {formatMoney(currentBudget)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 border-b border-white/5 bg-[#0a0a0a]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o país..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] text-white pl-10 pr-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setFilterPos('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                filterPos === 'ALL'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              Todos
            </button>
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setFilterPos(pos)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  filterPos === pos
                    ? 'bg-amber-500 text-black'
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0a]">
          {loading ? (
            <div className="text-center text-gray-500 py-10 text-sm">Cargando jugadores...</div>
          ) : players.length === 0 ? (
            <div className="text-center text-gray-500 py-10 text-sm">No se encontraron jugadores.</div>
          ) : (
            players.map((player) => {
              const canAfford = currentBudget >= player.price;

              return (
                <div
                  key={player.id}
                  className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5 hover:bg-white/10 transition-colors"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1a1a1a] rounded flex items-center justify-center text-sm font-bold text-gray-300 shrink-0 border border-white/10 overflow-hidden">
                         {player.flag ? (
                           <img src={player.flag} alt={player.teamCode} className="w-full h-full object-cover" />
                         ) : (
                           player.teamCode
                         )}
                      </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{player.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span>{player.country}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span className="font-bold tracking-widest text-gray-400">{player.position}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-amber-500 font-mono tracking-tight text-sm font-bold">
                        {formatMoney(player.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectPlayer(player)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-tighter transition-colors ${
                        canAfford
                          ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                          : 'text-gray-600 bg-white/5 cursor-not-allowed'
                      }`}
                    >
                      Fichar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
