import { useState } from 'react';
import MyTeam from './components/MyTeam';
import Market from './components/Market';
import Tournaments from './components/Tournaments';
import MatchdayBanner from './components/MatchdayBanner';
import { useFantasyTeam } from './hooks/useFantasyTeam';
import { RefreshCw } from 'lucide-react';
import { formatMoney } from './utils';
import { Player } from './types';

type Tab = 'team' | 'tournaments';

export default function App() {
  const { slots, budget, matchday, canEditSquad, loading, error, addPlayer, removePlayer, resetTeam, reload } = useFantasyTeam();
  const [tab, setTab] = useState<Tab>('team');
  const [marketOpen, setMarketOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const targetPosition = selectedSlotId
    ? slots.find((s) => s.id === selectedSlotId)?.position
    : undefined;

  const handleSelectSlot = (slotId: string) => {
    if (!canEditSquad) return;
    setSelectedSlotId(slotId);
    setMarketOpen(true);
  };

  const handleSelectPlayer = async (player: Player) => {
    if (selectedSlotId) {
      const success = await addPlayer(selectedSlotId, player);
      if (success) {
        setMarketOpen(false);
        setSelectedSlotId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Cargando equipo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <p className="text-gray-500 text-sm">Verifica que el backend esté activo y que worldcup26.ir responda.</p>
        <button
          onClick={reload}
          className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans">
      <header className="bg-[#121212] border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500 rounded-sm flex items-center justify-center font-black text-black">
              DT
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tighter uppercase whitespace-nowrap hidden sm:block">
              Gran DT <span className="text-amber-500">26</span>
            </h1>
          </div>

          <nav className="flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-gray-400 absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => setTab('team')}
              className={`py-5 -mb-0.5 whitespace-nowrap border-b-2 transition-colors ${
                tab === 'team' ? 'text-white border-amber-500' : 'border-transparent hover:text-gray-200'
              }`}
            >
              MI EQUIPO
            </button>
            <button
              onClick={() => setTab('tournaments')}
              className={`py-5 -mb-0.5 whitespace-nowrap border-b-2 transition-colors ${
                tab === 'tournaments' ? 'text-white border-amber-500' : 'border-transparent hover:text-gray-200'
              }`}
            >
              TORNEOS
            </button>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-6">
            {tab === 'team' && (
              <>
                <div className="text-right">
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest leading-none mb-1">
                    Presupuesto
                  </div>
                  <div className="text-sm sm:text-lg font-mono text-amber-500 tracking-tight leading-none">
                    {formatMoney(budget)}
                  </div>
                </div>
                <div className="h-8 sm:h-10 w-[1px] bg-white/10 hidden sm:block"></div>
                <button
                  onClick={resetTeam}
                  disabled={!canEditSquad}
                  className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-full transition-colors"
                  title={canEditSquad ? 'Reiniciar equipo' : 'Plantilla cerrada'}
                >
                  <RefreshCw size={16} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-8">
        {tab === 'team' ? (
          <>
            <div className="mb-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Tu Equipo</h2>
                <p className="text-gray-500 text-sm">Arma tu 11 ideal para la Fecha {matchday?.matchday ?? 2}.</p>
              </div>
              {matchday && <MatchdayBanner matchday={matchday} />}
            </div>
            <MyTeam
              slots={slots}
              onSelectSlot={handleSelectSlot}
              onRemovePlayer={removePlayer}
              canEdit={canEditSquad}
            />
          </>
        ) : (
          <Tournaments />
        )}
      </main>

      {marketOpen && (
        <Market
          onClose={() => {
            setMarketOpen(false);
            setSelectedSlotId(null);
          }}
          targetPosition={targetPosition}
          onSelectPlayer={handleSelectPlayer}
          currentBudget={budget}
        />
      )}
    </div>
  );
}
