import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const POS_BADGE: Record<string, string> = {
  DEL: 'bg-amber-500 text-black',
  MED: 'bg-sky-500 text-white',
  DEF: 'bg-emerald-500 text-white',
  POR: 'bg-yellow-400 text-black',
};

interface RuleRow {
  pos?: string;
  label: string;
  pts: string;
  negative?: boolean;
}

interface RuleGroup {
  title: string;
  note?: string;
  rows: RuleRow[];
}

const GROUPS: RuleGroup[] = [
  {
    title: 'Presencia en partido',
    note: 'Por cada partido jugado',
    rows: [{ label: 'Todos los jugadores', pts: '+1' }],
  },
  {
    title: 'Gol anotado',
    rows: [
      { pos: 'POR', label: 'Arquero', pts: '+6' },
      { pos: 'DEF', label: 'Defensor', pts: '+6' },
      { pos: 'MED', label: 'Mediocampista', pts: '+5' },
      { pos: 'DEL', label: 'Delantero', pts: '+4' },
    ],
  },
  {
    title: 'Arco en cero',
    note: 'El rival no convierte en el partido',
    rows: [
      { pos: 'POR', label: 'Arquero', pts: '+4' },
      { pos: 'DEF', label: 'Defensor', pts: '+4' },
    ],
  },
  {
    title: 'Gol recibido',
    note: 'Solo arqueros, por cada gol encajado',
    rows: [{ pos: 'POR', label: 'Arquero', pts: '-1', negative: true }],
  },
];

export default function PointsGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Info size={15} className="text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-300">¿Cómo se calculan los puntos?</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
              <p className="text-xs text-gray-500">
                Los puntos de cada fecha se suman para el total del torneo.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {GROUPS.map((group) => (
                  <div key={group.title} className="bg-white/3 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-0.5">
                      {group.title}
                    </p>
                    {group.note && (
                      <p className="text-[10px] text-gray-500 mb-2">{group.note}</p>
                    )}
                    <div className="space-y-1.5">
                      {group.rows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {row.pos ? (
                              <span
                                className={`${POS_BADGE[row.pos]} text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 tracking-wider`}
                              >
                                {row.pos}
                              </span>
                            ) : (
                              <span className="w-[26px] shrink-0" />
                            )}
                            <span className="text-[11px] text-gray-400 truncate">{row.label}</span>
                          </div>
                          <span
                            className={`text-sm font-black font-mono shrink-0 ${
                              row.negative ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {row.pts}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl px-3 py-2">
                <p className="text-[11px] text-amber-400/90 font-medium">
                  Total = suma de puntos de todas las fechas jugadas.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
