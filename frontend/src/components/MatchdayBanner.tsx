import { useState, useEffect } from 'react';
import { Lock, Clock, Trophy } from 'lucide-react';
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
    const timer = setInterval(() => setRemaining((p) => Math.max(0, p - 1000)), 1000);
    return () => clearInterval(timer);
  }, [matchday]);

  const locked = matchday.isLocked;

  return (
    <div
      className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 ${
        locked ? 'bg-red-500/8 border border-red-500/25' : 'glass-gold'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          locked ? 'bg-red-500/15' : 'bg-amber-500/15'
        }`}
      >
        {locked ? (
          <Lock size={18} className="text-red-400" />
        ) : (
          <Clock size={18} className="text-amber-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-white">Fecha {matchday.matchday}</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              locked ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {locked ? 'Cerrada' : 'Abierta'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {locked
            ? `Cerró el ${formatDateTime(matchday.lockDeadline)}`
            : `Cierra en ${formatCountdown(remaining)}`}
        </p>
      </div>

      <div className="text-right shrink-0 hidden xs:block">
        <div className="flex items-center gap-1 text-gray-500">
          <Trophy size={12} />
          <span className="text-[10px] font-semibold">
            {matchday.finishedCount}/{matchday.gamesCount}
          </span>
        </div>
        <p className="text-[9px] text-gray-600 mt-0.5">partidos</p>
      </div>
    </div>
  );
}
