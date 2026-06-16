import { LineupSlot } from '../types';
import { UserMinus, Plus } from 'lucide-react';
import { formatMoney } from '../utils';
import { motion } from 'motion/react';

interface MyTeamProps {
  slots: LineupSlot[];
  onSelectSlot: (slotId: string) => void;
  onRemovePlayer: (slotId: string) => void;
  canEdit?: boolean;
}

const POS_STYLE: Record<string, { badge: string; glow: string }> = {
  DEL: { badge: 'bg-amber-500 text-black', glow: 'shadow-amber-500/30' },
  MED: { badge: 'bg-sky-500 text-white', glow: 'shadow-sky-500/30' },
  DEF: { badge: 'bg-emerald-500 text-white', glow: 'shadow-emerald-500/30' },
  POR: { badge: 'bg-yellow-400 text-black', glow: 'shadow-yellow-400/30' },
};

export default function MyTeam({ slots, onSelectSlot, onRemovePlayer, canEdit = true }: MyTeamProps) {
  const gk = slots.filter((s) => s.position === 'POR');
  const def = slots.filter((s) => s.position === 'DEF');
  const mid = slots.filter((s) => s.position === 'MED');
  const fwd = slots.filter((s) => s.position === 'DEL');

  const renderSlot = (slot: LineupSlot, index: number) => {
    const style = POS_STYLE[slot.position] ?? POS_STYLE.DEL;

    return (
      <motion.div
        key={slot.id}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 22 }}
        className="flex flex-col items-center group relative w-[72px] xs:w-[80px] sm:w-[88px]"
      >
        {slot.player ? (
          <>
            <div
              className={`relative w-[60px] h-[72px] sm:w-[68px] sm:h-[80px] rounded-2xl overflow-hidden border border-white/10 shadow-lg ${style.glow} cursor-pointer active:scale-95 transition-transform`}
              onClick={() => canEdit && onRemovePlayer(slot.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/60" />
              {slot.player.flag ? (
                <img
                  src={slot.player.flag}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-white/90 text-sm sm:text-base drop-shadow-lg z-10">
                  {slot.player.teamCode}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePlayer(slot.id);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-20 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <UserMinus size={10} className="text-white" />
                </button>
              )}
            </div>
            <span className={`${style.badge} text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 tracking-wider`}>
              {slot.position}
            </span>
            <p className="text-[9px] sm:text-[10px] font-bold text-white text-center leading-tight mt-0.5 line-clamp-2 w-full px-0.5">
              {slot.player.name.split(' ').slice(-2).join(' ')}
            </p>
            <p className="text-[8px] sm:text-[9px] text-amber-500/80 font-mono">{formatMoney(slot.player.price)}</p>
          </>
        ) : (
          <>
            <button
              onClick={() => canEdit && onSelectSlot(slot.id)}
              disabled={!canEdit}
              className={`w-[60px] h-[72px] sm:w-[68px] sm:h-[80px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                canEdit
                  ? 'border-amber-500/40 bg-amber-500/5 slot-empty active:scale-95 hover:bg-amber-500/10'
                  : 'border-white/10 bg-white/3 opacity-40 cursor-not-allowed'
              }`}
            >
              <Plus size={20} className={canEdit ? 'text-amber-500/60' : 'text-white/20'} />
            </button>
            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1.5">Vacío</span>
          </>
        )}
      </motion.div>
    );
  };

  const rows = [
    { players: fwd, label: 'Delanteros', px: 'px-2' },
    { players: mid, label: 'Mediocampistas', px: 'px-1' },
    { players: def, label: 'Defensores', px: 'px-1' },
    { players: gk, label: 'Arquero', px: 'px-2' },
  ];

  let slotIndex = 0;

  return (
    <div className="relative w-full mx-auto">
      <div className="pitch-grass relative rounded-3xl border border-emerald-900/40 shadow-2xl shadow-black/60 overflow-hidden min-h-[480px] sm:min-h-[560px] md:min-h-[600px] flex flex-col justify-between py-6 sm:py-8 px-2">
        {/* Pitch markings */}
        <div className="absolute inset-3 sm:inset-6 border border-white/8 rounded-[40px] sm:rounded-[60px] pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[45%] h-14 sm:h-20 border-b border-x border-white/8 rounded-b-2xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[55%] h-16 sm:h-24 border-t border-x border-white/8" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/8" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-32 sm:h-32 border border-white/8 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/20 rounded-full" />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

        {rows.map(({ players, label, px }, rowIdx) => (
          <div key={label} className={`relative z-10 ${px}`}>
            <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] text-center mb-2 font-semibold hidden sm:block">
              {label}
            </p>
            <div
              className={`flex justify-center flex-wrap gap-2 sm:gap-3 ${
                rowIdx === 0 ? 'mt-2' : rowIdx === 3 ? 'mb-2' : ''
              }`}
            >
              {players.map((slot) => renderSlot(slot, slotIndex++))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
