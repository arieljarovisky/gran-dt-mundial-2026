import { useState } from 'react';
import MyTeam from './components/MyTeam';
import Market from './components/Market';
import Tournaments from './components/Tournaments';
import MatchdayBanner from './components/MatchdayBanner';
import AppShell from './components/AppShell';
import InstallPrompt from './components/InstallPrompt';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './context/AuthContext';
import { useFantasyTeam } from './hooks/useFantasyTeam';
import { motion, AnimatePresence } from 'motion/react';
import { Player } from './types';

type Tab = 'team' | 'tournaments';

function MainApp() {
  const { user, logout, updateTeamName } = useAuth();
  const { slots, budget, matchday, canEditSquad, loading, error, addPlayer, removePlayer, resetTeam, reload } =
    useFantasyTeam();
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
      <div className="app-bg min-h-dvh flex flex-col items-center justify-center gap-4 safe-top safe-bottom">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-2xl text-black animate-pulse">
          DT
        </div>
        <p className="text-gray-500 text-sm font-medium">Cargando tu equipo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-bg min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center safe-top safe-bottom">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <p className="text-red-400 font-semibold">{error}</p>
        <p className="text-gray-500 text-sm">Verificá que el backend esté activo.</p>
        <button onClick={reload} className="btn-primary px-8 py-3 text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <AppShell
        tab={tab}
        onTabChange={setTab}
        budget={budget}
        canEditSquad={canEditSquad}
        onReset={resetTeam}
        teamName={user?.teamName}
        email={user?.email}
        onUpdateTeamName={updateTeamName}
        onLogout={logout}
      >
        <AnimatePresence mode="wait">
          {tab === 'team' ? (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 md:space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-extrabold text-white">{user?.teamName}</h2>
                <p className="text-gray-500 text-sm">
                  Fecha {matchday?.matchday ?? 2} · Tocá un puesto vacío para fichar
                </p>
              </div>

              {matchday && <MatchdayBanner matchday={matchday} />}

              <MyTeam
                slots={slots}
                onSelectSlot={handleSelectSlot}
                onRemovePlayer={removePlayer}
                canEdit={canEditSquad}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tournaments"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Tournaments />
            </motion.div>
          )}
        </AnimatePresence>
      </AppShell>

      <InstallPrompt />

      <AnimatePresence>
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
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-bg min-h-dvh flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-2xl text-black animate-pulse">
          DT
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <MainApp />;
}
