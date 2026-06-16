import { useState, useEffect } from 'react';
import { Copy, Users, Trophy, ArrowLeft, Check, Crown, Medal } from 'lucide-react';
import { motion } from 'motion/react';
import {
  fetchTournaments,
  createTournament,
  joinTournament,
  fetchTournament,
  fetchTournamentStandings,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TournamentDetail, TournamentSummary, TournamentStandings } from '../types';
import { formatMoney } from '../utils';
import MatchdayBanner from './MatchdayBanner';

type View = 'list' | 'detail';

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={16} className="text-amber-400" />;
  if (rank === 2) return <Medal size={16} className="text-gray-300" />;
  if (rank === 3) return <Medal size={16} className="text-amber-700" />;
  return <span className="text-gray-500 font-mono text-sm w-4 text-center">{rank}</span>;
}

export default function Tournaments() {
  const { user } = useAuth();
  const displayName = user?.teamName || 'Mi Equipo';
  const [view, setView] = useState<View>('list');
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selected, setSelected] = useState<TournamentDetail | null>(null);
  const [standings, setStandings] = useState<TournamentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadList = async () => {
    try {
      setError(null);
      setTournaments(await fetchTournaments());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los torneos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadList(); }, []);

  const openTournament = async (id: string) => {
    try {
      setError(null);
      const [data, standingsData] = await Promise.all([
        fetchTournament(id),
        fetchTournamentStandings(id),
      ]);
      setSelected(data);
      setStandings(standingsData);
      setView('detail');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el torneo.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tournament = await createTournament({ name: createName, displayName });
      setCreateName('');
      setSelected(tournament);
      setView('detail');
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el torneo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tournament = await joinTournament({ inviteCode: joinCode, displayName });
      setJoinCode('');
      setSelected(tournament);
      setView('detail');
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo unir al torneo.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === 'detail' && selected) {
    return (
      <div className="space-y-4 md:space-y-6">
        <button
          onClick={() => { setView('list'); setSelected(null); setStandings(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium active:scale-95 transition-all"
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="glass rounded-2xl p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">{selected.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {selected.memberCount}/{selected.maxMembers} participantes
              </p>
            </div>
            <div className="glass-gold rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Código</p>
                <p className="text-2xl font-mono font-black text-gradient-gold tracking-[0.2em] mt-0.5">
                  {selected.inviteCode}
                </p>
              </div>
              <button
                onClick={() => copyCode(selected.inviteCode)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-95 transition-all"
              >
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-gray-400" />}
              </button>
            </div>
          </div>
        </div>

        {selected.matchday && <MatchdayBanner matchday={selected.matchday} />}

        {standings && standings.standings.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Tabla · Fecha {standings.activeMatchday}+
              </h3>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/5">
              {standings.standings.map((row) => (
                <div
                  key={row.userId}
                  className={`px-4 py-3 flex items-center gap-3 ${row.rank === 1 ? 'bg-amber-500/5' : ''}`}
                >
                  <RankIcon rank={row.rank} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{row.displayName}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {standings.matchdays.map((md) => (
                        <span key={md} className="text-[10px] text-gray-500">
                          F{md}: <span className="text-gray-300 font-semibold">{row.matchdayPoints[String(md)] ?? 0}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-lg font-black text-gradient-gold">{row.totalPoints}</span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="text-left px-4 py-2.5 w-12">#</th>
                    <th className="text-left px-4 py-2.5">Jugador</th>
                    {standings.matchdays.map((md) => (
                      <th key={md} className="text-center px-3 py-2.5">F{md}</th>
                    ))}
                    <th className="text-center px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.standings.map((row) => (
                    <tr key={row.userId} className={`border-b border-white/5 ${row.rank === 1 ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-4 py-3"><RankIcon rank={row.rank} /></td>
                      <td className="px-4 py-3 font-bold text-white">{row.displayName}</td>
                      {standings.matchdays.map((md) => (
                        <td key={md} className="text-center px-3 py-3 text-gray-300">
                          {row.matchdayPoints[String(md)] ?? 0}
                        </td>
                      ))}
                      <td className="text-center px-4 py-3 font-black text-amber-400">{row.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Participantes</h3>
          {selected.members.map((member, i) => (
            <motion.div
              key={member.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`glass rounded-2xl p-4 flex items-center justify-between gap-3 ${
                member.isYou ? 'border-amber-500/30' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">{member.displayName}</span>
                  {member.isYou && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase">Vos</span>
                  )}
                  {member.isCreator && (
                    <span className="text-[9px] bg-white/8 text-gray-400 px-1.5 py-0.5 rounded-full font-bold uppercase">Host</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {member.playersCount}/{member.totalSlots} jugadores · {formatMoney(member.squadValue)}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                  member.isComplete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-gray-500'
                }`}
              >
                {member.isComplete ? '✓ Listo' : 'Armando'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">Torneos</h2>
        <p className="text-gray-500 text-sm mt-1">Competí con amigos por fecha del Mundial</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-2xl px-4 py-3">{error}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <form onSubmit={handleCreate} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy size={17} />
            <h3 className="font-bold text-sm">Crear torneo</h3>
          </div>
          <p className="text-xs text-gray-500">
            Crearás el torneo como <span className="text-amber-400 font-semibold">{displayName}</span>
          </p>
          <input className="input-field text-sm" placeholder="Nombre del torneo" value={createName} onChange={(e) => setCreateName(e.target.value)} required minLength={3} />
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
            {submitting ? 'Creando...' : 'Crear torneo'}
          </button>
        </form>

        <form onSubmit={handleJoin} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Users size={17} />
            <h3 className="font-bold text-sm">Unirse con código</h3>
          </div>
          <p className="text-xs text-gray-500">Participarás como <span className="text-amber-400 font-semibold">{displayName}</span></p>
          <input className="input-field text-sm font-mono tracking-widest uppercase" placeholder="ABC123" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required minLength={4} />
          <button type="submit" disabled={submitting} className="btn-ghost w-full py-2.5 text-sm">
            {submitting ? 'Uniéndose...' : 'Unirse'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Mis torneos</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border-dashed">
            <Trophy size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Sin torneos todavía</p>
            <p className="text-gray-600 text-xs mt-1">Creá uno o unite con un código</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tournaments.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openTournament(t.id)}
                className="w-full glass rounded-2xl p-4 flex items-center justify-between text-left hover:border-amber-500/20 active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.memberCount}/{t.maxMembers} · <span className="font-mono text-amber-500/80">{t.inviteCode}</span>
                  </p>
                </div>
                <Trophy size={18} className="text-gray-600 shrink-0 ml-3" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
