import { useState, useEffect } from 'react';
import { Lock, Clock } from 'lucide-react';
import { MatchdayInfo } from '../types';
import { formatCountdown, formatDateTime } from '../utils/matchday';

interface MatchdayBannerProps {
  matchday: MatchdayInfo;
}

export default function MatchdayBanner({ matchday }: MatchdayBannerProps) {
  const [remaining, setRemaining] = useState(matchday.msUntilLock);

  useEffect(() => {
    setRemaining(matchday.msUntilLock);
    if (matchday.isLocked) return;

    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [matchday]);

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
        matchday.isLocked
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <div className="flex items-center gap-2">
        {matchday.isLocked ? (
          <Lock size={16} className="text-red-400 shrink-0" />
        ) : (
          <Clock size={16} className="text-amber-500 shrink-0" />
        )}
        <div>
          <div className="text-sm font-bold text-white">
            Fecha {matchday.matchday}
            {matchday.isLocked ? ' · Plantilla cerrada' : ' · Armá tu plantilla'}
          </div>
          <div className="text-xs text-gray-400">
            {matchday.isLocked
              ? `Cierre: ${formatDateTime(matchday.lockDeadline)} (1h antes del primer partido)`
              : `Cierra en ${formatCountdown(remaining)} · ${formatDateTime(matchday.lockDeadline)}`}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Partidos: {matchday.finishedCount}/{matchday.gamesCount}
      </div>
    </div>
  );
}
