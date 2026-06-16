import { LineupSlot } from '../types';
import { UserMinus } from 'lucide-react';
import { formatMoney } from '../utils';

interface MyTeamProps {
  slots: LineupSlot[];
  onSelectSlot: (slotId: string) => void;
  onRemovePlayer: (slotId: string) => void;
  canEdit?: boolean;
}

export default function MyTeam({ slots, onSelectSlot, onRemovePlayer, canEdit = true }: MyTeamProps) {
  const gk = slots.filter((s) => s.position === 'POR');
  const def = slots.filter((s) => s.position === 'DEF');
  const mid = slots.filter((s) => s.position === 'MED');
  const fwd = slots.filter((s) => s.position === 'DEL');

  const getBadgeColor = (pos: string) => {
    switch (pos) {
      case 'DEL':
        return 'bg-amber-500 text-black';
      case 'MED':
        return 'bg-blue-500 text-white';
      case 'DEF':
        return 'bg-emerald-500 text-white';
      case 'POR':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const renderSlot = (slot: LineupSlot) => (
    <div
      key={slot.id}
      className="flex flex-col items-center group relative cursor-pointer"
      onClick={() => canEdit && slot.player && onRemovePlayer(slot.id)}
    >
      {slot.player ? (
        <>
          <div className="w-14 h-16 sm:w-16 sm:h-20 bg-[#1a1a1a] border border-white/10 rounded-md mb-2 flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <span className="font-bold text-gray-200 text-base sm:text-lg z-10">{slot.player.teamCode}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) onRemovePlayer(slot.id);
              }}
              disabled={!canEdit}
              className="absolute -top-1 -right-1 bg-red-500/80 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:hidden transition-opacity z-20"
            >
              <UserMinus size={12} className="w-3 h-3" />
            </button>
          </div>
          <div
            className={`${getBadgeColor(slot.position)} text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-sm mb-1`}
          >
            {slot.position}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-white max-w-full truncate px-1 text-center">
            {slot.player.name}
          </div>
          <div className="text-[9px] text-gray-400 font-mono tracking-tight">
            {formatMoney(slot.player.price)}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => canEdit && onSelectSlot(slot.id)}
            disabled={!canEdit}
            className="w-14 h-16 sm:w-16 sm:h-20 bg-white/5 border border-dashed border-white/20 rounded-md mb-2 flex items-center justify-center hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors z-10"
          >
            <span className="text-2xl text-white/20">+</span>
          </button>
          <div className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            Vacío
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[3/4] sm:aspect-[4/5] bg-[#0e0e0e] rounded-t-[60px] sm:rounded-t-[100px] overflow-hidden flex flex-col justify-between py-8 sm:py-12 border border-white/5 rounded-b-xl sm:rounded-b-2xl shadow-2xl">
      <div className="absolute inset-4 sm:inset-12 border border-white/5 rounded-t-[60px] sm:rounded-t-[80px] pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 sm:w-[40%] h-24 sm:h-32 border-t border-x border-white/5"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 sm:w-1/4 h-12 sm:h-16 border-b border-x border-white/5 rounded-b-xl"></div>
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-40 sm:h-40 border border-white/5 rounded-full"></div>
      </div>

      <div className="flex justify-center z-10 gap-6 sm:gap-16 mt-4 sm:mt-8">{fwd.map(renderSlot)}</div>
      <div className="flex justify-around px-4 sm:px-16 z-10">{mid.map(renderSlot)}</div>
      <div className="flex justify-around px-4 sm:px-12 z-10">{def.map(renderSlot)}</div>
      <div className="flex justify-center z-10 mb-4 sm:mb-8">{gk.map(renderSlot)}</div>
    </div>
  );
}
